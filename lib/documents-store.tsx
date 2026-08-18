import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import type { DocumentSlot } from '@/lib/documents-data';
import { getMobileOverview, type MobileOverview } from '@/lib/mobile-api';
import {
  RUN_STAGES,
  labelFor,
  pickDocument,
  progressFrom,
  runZoeyOnEngine,
  stagesFrom,
  uploadDocumentToEngine,
  type RunOutcome,
  type RunStageId,
  type StageState,
} from '@/lib/mobile-documents';

/**
 * The Documents screen's state, read from the real credit engine.
 *
 * ==========================  WHAT THIS REPLACED  ==========================
 *
 * A local fixture of slots that started life half "uploaded", an optimistic row flip that reported
 * success before the server had seen anything, and an analysis whose stages advanced on a timer --
 * `deriveStages(Date.now() - startedAt)` against hardcoded durations. The screen filled in whether
 * or not a document existed or a single line of a report had been read.
 *
 * Nothing here advances on its own. Every field below comes from an engine response, so with no
 * response nothing changes -- which is the difference between reporting progress and animating it.
 *
 * ==========================  WHOSE DOCUMENTS  ==========================
 *
 * The engine decides, from the Supabase token. This module never sends a client id, and the slot
 * ids it renders are the engine's own, handed back verbatim on upload.
 */

/** Phases the screens gate on. Derived from the engine, never from elapsed time. */
export type AnalysisPhase =
  | 'DOCUMENTS_INCOMPLETE'
  | 'DOCUMENTS_READY'
  | 'ANALYSIS_RUNNING'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_FAILED';

export type Milestone = { id: string; label: string; state: 'done' | 'current' | 'pending' };

/** Per-slot upload state, so a row can show what is genuinely happening to it. */
export type SlotUploadState =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'rejected'; message: string }
  | { kind: 'failed'; message: string };

type StageDescriptor = { id: string; label: string };

/** Why Run Zoey is or is not available. `reason` is null when it is available. */
export type Readiness = { ready: boolean; reason: string | null };

type DocumentsContextValue = {
  slots: DocumentSlot[];
  missing: DocumentSlot[];
  requiredComplete: boolean;

  phase: AnalysisPhase;
  stages: Record<string, StageState>;
  stageList: StageDescriptor[];
  progress: number;
  milestones: Milestone[];
  currentMilestone?: string;
  blockedReason?: string;

  /** Whether Start Zoey is available, and if not, the real reason. */
  readiness: Readiness;
  /** True while the overview is being read for the first time. */
  loading: boolean;
  /** Per-slot upload state, keyed by slot id. */
  uploadState: Record<string, SlotUploadState>;

  /** Opens the picker and sends the chosen file's bytes. Resolves when the server has answered. */
  uploadSlot: (slotId: string) => Promise<void>;
  runZoey: () => Promise<void>;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
};

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

const STAGE_LIST: StageDescriptor[] = RUN_STAGES.map((s) => ({ id: s.id, label: s.label }));
const ALL_PENDING: Record<string, StageState> = Object.fromEntries(RUN_STAGES.map((s) => [s.id, 'pending']));

/** How often to re-read while the engine says work is genuinely in flight. */
const POLL_MS = 4000;

/** Checklist status -> the row's plain-language line. */
function detailFor(status: string): string {
  switch (status) {
    case 'ACCEPTED':
      return 'Accepted';
    case 'RECEIVED':
      return 'Received — being reviewed';
    case 'REPLACE_REQUESTED':
      return 'Another copy needed';
    default:
      return 'Not uploaded yet';
  }
}

/** The engine's checklist, as rows. Slot ids are the engine's and are never rewritten. */
export function slotsFromOverview(overview: MobileOverview | null): DocumentSlot[] {
  if (!overview) return [];
  return overview.intake.checklist.map((item) => ({
    id: item.slot,
    name: item.label,
    state: item.status === 'ACCEPTED' || item.status === 'RECEIVED' ? 'uploaded' : 'pending',
    kind: 'uploaded',
    detail: detailFor(item.status),
    // The engine's flag, not a local list. Supporting evidence is optional, and an optional row
    // outstanding must never read as something the client has failed to do.
    optional: item.required === false,
  }));
}

/** Analysis state as the engine reports it. No clock is consulted. */
export function phaseFromOverview(overview: MobileOverview | null, requiredComplete: boolean): AnalysisPhase {
  const state = overview?.analysis.state;
  if (state === 'IN_PROGRESS') return 'ANALYSIS_RUNNING';
  if (state === 'COMPLETE') return 'ANALYSIS_COMPLETE';
  if (state === 'NEEDS_ATTENTION') return 'ANALYSIS_FAILED';
  return requiredComplete ? 'DOCUMENTS_READY' : 'DOCUMENTS_INCOMPLETE';
}

function milestonesFrom(stages: Record<string, StageState>): Milestone[] {
  return RUN_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    state: stages[stage.id] === 'done' ? 'done' : stages[stage.id] === 'active' ? 'current' : 'pending',
  }));
}

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [overview, setOverview] = useState<MobileOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Record<string, StageState>>({ ...ALL_PENDING });
  const [currentMilestone, setCurrentMilestone] = useState<string | undefined>();
  const [blockedReason, setBlockedReason] = useState<string | undefined>();
  const [uploadState, setUploadState] = useState<Record<string, SlotUploadState>>({});
  /*
   * `uploadSlot` is memoised, so reading `uploadState` inside it would read whatever the value was
   * when the callback was built. The guard has to see the CURRENT value or it never fires.
   */
  const uploadStateRef = useRef<Record<string, SlotUploadState>>({});
  uploadStateRef.current = uploadState;

  // Guards a slow response for a previous user landing after a switch.
  const requestFor = useRef<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!userId) {
      setOverview(null);
      setLoading(false);
      return;
    }
    requestFor.current = userId;
    const result = await getMobileOverview();
    if (requestFor.current !== userId) return;
    setOverview(result.state === 'LINKED' ? result.overview : null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const slots = useMemo(() => slotsFromOverview(overview), [overview]);
  /*
   * REQUIRED rows only. `missing` drives what the client is told they still owe, and listing an
   * optional row there is what made a receipt look like a blocker.
   */
  const missing = useMemo(() => slots.filter((s) => s.state === 'pending' && !s.optional), [slots]);
  const requiredComplete = overview?.intake.complete === true;
  const phase = phaseFromOverview(overview, requiredComplete);

  /*
   * WHY the button is unavailable, in the client's words.
   *
   * Two different situations used to look identical -- a document not sent, and a document sent and
   * waiting on a specialist. The second is not something the client can act on, and showing them a
   * dead button with no sentence is what made a successful upload feel like a failure.
   */
  const readiness = useMemo<Readiness>(() => {
    if (loading) return { ready: false, reason: null };
    if (requiredComplete) return { ready: true, reason: null };
    if (missing.length > 0) {
      return { ready: false, reason: `Zoey still needs your ${missing.map((m) => m.name.toLowerCase()).join(', ')}.` };
    }
    // Everything required has arrived, so the hold is review, not the client.
    return {
      ready: false,
      reason: 'Your documents are in and your specialist is reviewing them. Zoey can start once they are accepted.',
    };
  }, [loading, requiredComplete, missing]);

  /*
   * Polling exists only while the engine says work is in flight, and stops the moment it does not.
   * A poll that continues past a terminal state is a timer with extra steps.
   */
  useEffect(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    if (phase !== 'ANALYSIS_RUNNING') return;
    pollTimer.current = setTimeout(() => refresh(), POLL_MS);
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [phase, overview, refresh]);

  const uploadSlot = useCallback(
    async (slotId: string) => {
      // A second tap while the first upload is in flight would open the picker again and store the
      // same document twice. The row is already showing "Uploading"; ignore the tap.
      if (uploadStateRef.current[slotId]?.kind === 'uploading') return;

      const picked = await pickDocument();
      if (picked.state === 'cancelled') return;

      setUploadState((prev) => ({ ...prev, [slotId]: { kind: 'uploading' } }));
      const result = await uploadDocumentToEngine(slotId, picked.document);

      if (result.state === 'uploaded') {
        setUploadState((prev) => ({ ...prev, [slotId]: { kind: 'idle' } }));
        // The server is the authority on what the row now says, so re-read rather than guess.
        await refresh();
        return;
      }

      setUploadState((prev) => ({
        ...prev,
        [slotId]: result.state === 'rejected' ? { kind: 'rejected', message: result.message } : { kind: 'failed', message: result.message },
      }));
    },
    [refresh]
  );

  const applyRun = useCallback(
    (stage: RunStageId, outcome: RunOutcome, message: string) => {
      setStages(stagesFrom(stage, outcome));
      setCurrentMilestone(stage);
      setBlockedReason(outcome === 'READY' || outcome === 'ALREADY_RUNNING' ? undefined : message);
    },
    []
  );

  const runZoey = useCallback(async () => {
    setStages({ ...ALL_PENDING });
    setBlockedReason(undefined);
    setCurrentMilestone(RUN_STAGES[0].id);

    const result = await runZoeyOnEngine();
    applyRun(result.stage, result.outcome, result.message);
    // Intake and analysis state both move as a result of a run, so re-read both.
    await refresh();
  }, [applyRun, refresh]);

  const retry = useCallback(async () => {
    await runZoey();
  }, [runZoey]);

  const value = useMemo<DocumentsContextValue>(
    () => ({
      slots,
      missing,
      requiredComplete,
      phase,
      stages,
      stageList: STAGE_LIST,
      progress: progressFrom(stages),
      milestones: milestonesFrom(stages),
      currentMilestone: currentMilestone ? labelFor(currentMilestone as RunStageId) : undefined,
      blockedReason,
      readiness,
      loading,
      uploadState,
      uploadSlot,
      runZoey,
      retry,
      refresh,
    }),
    [slots, missing, requiredComplete, phase, stages, currentMilestone, blockedReason, readiness, loading, uploadState, uploadSlot, runZoey, retry, refresh]
  );

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used inside <DocumentsProvider>');
  return ctx;
}
