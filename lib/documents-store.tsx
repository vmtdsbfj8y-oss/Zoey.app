import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/lib/auth-context';
import type { DocumentSlot } from '@/lib/documents-data';
import { getMobileOverview, type MobileOverview } from '@/lib/mobile-api';
import {
  RUN_STAGES,
  labelFor,
  pickDocument,
  progressFrom,
  recheckDocuments,
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
  | { kind: 'failed'; message: string }
  /** Stored and valid enough to keep, but a person still has to look. Not an error. */
  | { kind: 'review'; message: string };

type StageDescriptor = { id: string; label: string };

/** Why Run Zoey is or is not available. `reason` is null when it is available. */
export type Readiness = { ready: boolean; reason: string | null };

/**
 * What the START ZOEY control is doing right now.
 *
 * `starting` exists because the request takes a moment and the tap has to be acknowledged before
 * the answer arrives -- waiting for the response to change anything is what made the button look
 * dead and produced eighteen submissions.
 */
export type RunState = 'idle' | 'starting' | 'working' | 'attention' | 'failed';

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
  /** What the run control is doing. Drives its label and whether it is tappable. */
  runState: RunState;
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
    /*
     * ONLY 'ACCEPTED' counts as done. RECEIVED means the file is in and the requirement is still
     * unmet, which is exactly the case that left a green tick above a disabled Start Zoey.
     */
    state: item.status === 'ACCEPTED' ? 'uploaded' : 'pending',
    review: item.status === 'RECEIVED',
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
  const [runState, setRunState] = useState<RunState>('idle');

  /*
   * THE LOCK IS A REF, NOT STATE.
   *
   * `setRunState` does not take effect until the next render, so two taps dispatched in the same
   * frame both read the old value and both send. A ref changes on the line it is assigned, which is
   * the only thing that holds inside a single frame.
   */
  const runInFlight = useRef(false);
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

  /*
   * On open: ask the engine to decide anything still waiting, THEN read.
   *
   * The order matters -- reading first would render the pre-decision state and only correct itself
   * on the next refresh, which is the flicker between "being reviewed" and "accepted" that makes a
   * screen look unreliable. The recheck is best effort; if it fails, the read still happens.
   */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      await recheckDocuments();
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const slots = useMemo(() => slotsFromOverview(overview), [overview]);
  /*
   * REQUIRED rows only. `missing` drives what the client is told they still owe, and listing an
   * optional row there is what made a receipt look like a blocker.
   */
  const missing = useMemo(
    // What the client still has to SEND. A document under review is not owed by them.
    () => slots.filter((s) => s.state === 'pending' && !s.optional && !s.review),
    [slots]
  );
  const requiredComplete = overview?.intake.complete === true;
  const phase = phaseFromOverview(overview, requiredComplete);

  /*
   * RELAUNCH RESTORES THE TRUTH.
   *
   * `runState` lives in memory, so a reopened app starts at 'idle' -- and would show START ZOEY
   * over a run that is genuinely still going. The backend's own analysis state is what corrects
   * that. Only ever upgrades an idle control; it never overrides a state this session set.
   */
  useEffect(() => {
    if (runInFlight.current) return;
    if (phase === 'ANALYSIS_RUNNING') setRunState('working');
    else if (phase === 'ANALYSIS_FAILED') setRunState('attention');
    else if (phase === 'ANALYSIS_COMPLETE') setRunState('idle');
  }, [phase]);

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
        setUploadState((prev) => ({
          ...prev,
          // Accepted needs no note; held-for-review says why, without looking like a failure.
          [slotId]: result.accepted || !result.reviewReason ? { kind: 'idle' } : { kind: 'review', message: result.reviewReason },
        }));
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
    // Set before the first await, so a second tap in the same frame sees it.
    if (runInFlight.current) return;
    runInFlight.current = true;

    setRunState('starting');
    setStages({ ...ALL_PENDING });
    setBlockedReason(undefined);
    setCurrentMilestone(RUN_STAGES[0].id);

    try {
      const result = await runZoeyOnEngine();
      applyRun(result.stage, result.outcome, result.message);

      if (result.outcome === 'BLOCKED') setRunState('attention');
      else if (result.outcome === 'UNAVAILABLE') setRunState('failed');
      else if (result.outcome === 'ALREADY_RUNNING') setRunState('working');
      else setRunState('idle');

      /*
       * The lock is released only where a further tap is meaningful: a genuine failure, or a
       * finished run. While work is in flight it stays held, because the honest answer to another
       * tap is the one already on screen.
       */
      if (result.outcome !== 'ALREADY_RUNNING') runInFlight.current = false;

      // Intake and analysis state both move as a result of a run, so re-read both.
      await refresh();
    } catch {
      setRunState('failed');
      runInFlight.current = false;
    }
  }, [applyRun, refresh]);

  const retry = useCallback(async () => {
    // An explicit retry clears the lock a failure left behind.
    runInFlight.current = false;
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
      runState,
      loading,
      uploadState,
      uploadSlot,
      runZoey,
      retry,
      refresh,
    }),
    [slots, missing, requiredComplete, phase, stages, currentMilestone, blockedReason, readiness, runState, loading, uploadState, uploadSlot, runZoey, retry, refresh]
  );

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used inside <DocumentsProvider>');
  return ctx;
}
