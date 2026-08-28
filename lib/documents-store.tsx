import { Alert } from 'react-native';
import { tr } from './i18n/runtime';
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
  pickFromCamera,
  pickFromLibrary,
  readableFileSize,
  uploadDocumentToEngine,
  type RunOutcome,
  type RunStageId,
  type StageState,
} from '@/lib/mobile-documents';
import { MAX_UPLOAD_BYTES, tooLargeMessage } from '@/lib/documents-data';
import { statusDetailKey } from '@/lib/document-copy';
import { extensionOnly, recordUploadDiagnostic, uriScheme } from '@/lib/upload-diagnostics';
import {
  permissionDeniedMessage,
  sourceLabel,
  sourcesForSlot,
  type UploadSource,
} from '@/lib/upload-sources';
import {
  optimizeImageForUpload,
  planImageOptimization,
  readFileSize,
  stillTooLargeMessage,
} from '@/lib/image-optimization';

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
  /** Re-encoding an oversized photo before it is sent. Brief, and only for images. */
  | { kind: 'preparing' }
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
  /**
   * Start Zoey. `RERUN` asks the engine to analyse again rather than resume -- see
   * `runZoeyOnEngine`. The button that offers it is only shown when analysis is already complete.
   */
  runZoey: (mode?: 'START' | 'RERUN') => Promise<void>;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
};

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

const STAGE_LIST: StageDescriptor[] = RUN_STAGES.map((s) => ({ id: s.id, label: s.label }));
const ALL_PENDING: Record<string, StageState> = Object.fromEntries(RUN_STAGES.map((s) => [s.id, 'pending']));

/** How often to re-read while the engine says work is genuinely in flight. */
const POLL_MS = 4000;

/**
 * How long the app will show "Zoey is working" without the engine ever confirming it.
 *
 * The screen is a claim about the server, so it cannot outlive the app's ability to check that
 * claim. If polling fails, or the engine never reports IN_PROGRESS, this bounds the lie: once it
 * passes, local belief is discarded and whatever the engine last said is what the client sees.
 *
 * Generous, because a real run can legitimately take a while and cutting one short mid-flight would
 * be its own kind of wrong. Finite, because "forever" is not a state anyone can act on.
 */
const WORKING_MAX_MS = 3 * 60 * 1000;

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
    /*
     * Surfaced so a caller can offer "Replace" rather than "Upload" -- the one outstanding status
     * where the consumer HAS sent something and still has something to do. `state` still reads
     * 'pending', so every row that ignores this flag behaves exactly as it did before.
     */
    replaceRequested: item.status === 'REPLACE_REQUESTED',
    kind: 'uploaded',
    detail: detailFor(item.status),
    // The key the row renders from, so the line follows the reader's language rather than the
    // language this string happened to be built in.
    detailKey: statusDetailKey(item.status),
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

/**
 * The source chooser.
 *
 * A native alert rather than a new sheet: the Documents screen already has its own design and this
 * is a three-way question asked once, not a surface. `Alert` is what iOS users expect from a tap
 * that needs a choice, and it costs the screen nothing.
 */
function askUploadSource(sources: UploadSource[]): Promise<UploadSource | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Add document',
      tr('upload.howToAdd'),
      [
        ...sources.map((source) => ({
          text: sourceLabel(source),
          onPress: () => resolve(source),
        })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
      ],
      // A dismissed alert is a cancel, not a hang.
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
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
   * When the current working state began, or null when the app is not claiming one.
   *
   * `runInFlight` used to stay latched true for the whole of an ALREADY_RUNNING response, which
   * disabled the reconciliation effect below permanently -- the app kept saying "Zoey is working"
   * with nothing left that could ever contradict it. The ref now covers only the request itself,
   * and this timestamp is what bounds the belief that outlives it.
   */
  const workingSince = useRef<number | null>(null);
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
    // Only while a request is literally in flight. A response is about to arrive and will decide.
    if (runInFlight.current) return;

    if (phase === 'ANALYSIS_RUNNING') {
      setRunState('working');
      if (workingSince.current === null) workingSince.current = Date.now();
      return;
    }

    /*
     * THE ENGINE SAYS THE WORK IS NOT RUNNING.
     *
     * This used to be unreachable whenever a run had returned ALREADY_RUNNING, because the guard
     * above was latched for the lifetime of that state -- so a run that had already finished or
     * blocked left the phone insisting it was still going, with nothing polling and nothing able to
     * correct it. Backend truth now lands immediately, which is the only defensible behaviour: the
     * app is reporting the server's state, not its own.
     *
     * The one exception is a brief grace period after ALREADY_RUNNING. A run claimed by another
     * request may not have written a task yet, and snapping to "complete" on that gap would be just
     * as wrong in the other direction. It is bounded by WORKING_MAX_MS and nothing else.
     */
    const claiming = runState === 'working' || runState === 'starting';
    const withinGrace =
      claiming && workingSince.current !== null && Date.now() - workingSince.current < WORKING_MAX_MS;
    if (withinGrace) return;

    workingSince.current = null;
    if (phase === 'ANALYSIS_FAILED') setRunState('attention');
    else if (phase === 'ANALYSIS_COMPLETE') setRunState('idle');
    else if (claiming) setRunState('idle');
  }, [phase, runState]);

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
      reason: tr('documents.reviewingBody'),
    };
  }, [loading, requiredComplete, missing]);

  /*
   * Polling exists only while the engine says work is in flight, and stops the moment it does not.
   * A poll that continues past a terminal state is a timer with extra steps.
   */
  useEffect(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);

    /*
     * Poll while the ENGINE says work is running, and also while the APP believes it is.
     *
     * Keying on the engine alone was the deadlock: a run answered ALREADY_RUNNING, the phone showed
     * "Zoey is working", and because the refreshed overview did not say IN_PROGRESS, polling never
     * started -- so the one thing that could have corrected the screen was the thing the screen's
     * own wrongness prevented. The app must keep asking precisely while it is making a claim it
     * cannot yet substantiate.
     */
    const claiming = runState === 'working' || runState === 'starting';
    const expired = workingSince.current !== null && Date.now() - workingSince.current >= WORKING_MAX_MS;
    if (phase !== 'ANALYSIS_RUNNING' && !(claiming && !expired)) return;

    pollTimer.current = setTimeout(() => void refresh(), POLL_MS);
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [phase, overview, refresh, runState]);

  /*
   * THE FAIL-SAFE, INDEPENDENT OF POLLING.
   *
   * Everything above depends on refresh() eventually succeeding. If it never does -- the network is
   * gone, the engine is unreachable -- the deadline would never be evaluated and the working screen
   * would persist on a timer that keeps firing into failure. This wakes up on its own to end it.
   */
  useEffect(() => {
    if (runState !== 'working' && runState !== 'starting') return;
    if (workingSince.current === null) workingSince.current = Date.now();
    const remaining = Math.max(0, WORKING_MAX_MS - (Date.now() - workingSince.current));
    const timer = setTimeout(() => {
      if (runInFlight.current) return;
      workingSince.current = null;
      runInFlight.current = false;
      // Whatever the engine last told us wins. Never a claim of our own.
      setRunState(phase === 'ANALYSIS_RUNNING' ? 'working' : phase === 'ANALYSIS_FAILED' ? 'attention' : 'idle');
    }, remaining + 250);
    return () => clearTimeout(timer);
  }, [runState, phase]);

  const uploadSlot = useCallback(
    async (slotId: string) => {
      // A second tap while the first upload is in flight would open the picker again and store the
      // same document twice. The row is already showing "Uploading"; ignore the tap.
      if (uploadStateRef.current[slotId]?.kind === 'uploading') return;

      /*
       * WHERE THE DOCUMENT COMES FROM, ASKED BEFORE ANYTHING ELSE.
       *
       * A slot that can be photographed offers all three; a credit report offers only Choose File,
       * because a camera photo of one is a document the pipeline cannot read. One source means no
       * question -- nobody should tap through a menu with a single item.
       */
      const sources = sourcesForSlot(slotId);
      const source = sources.length === 1 ? sources[0] : await askUploadSource(sources);
      if (!source) return;

      const picked =
        source === 'camera'
          ? await pickFromCamera()
          : source === 'library'
            ? await pickFromLibrary()
            : await pickDocument();

      if (picked.state === 'cancelled') return;

      if (picked.state === 'denied') {
        /*
         * A refusal is an answer, not an obstacle to argue with. Say what the permission was for,
         * say what still works, and stop -- Choose File is untouched by either decision.
         */
        setUploadState((prev) => ({
          ...prev,
          [slotId]: { kind: 'failed', message: permissionDeniedMessage(picked.source) },
        }));
        return;
      }

      /*
       * An oversized PHOTO is made to fit; an oversized anything-else is refused honestly. A PDF is
       * never re-encoded -- the credit report's bytes are the evidence.
       */
      const maxBytes = overview?.limits.maxUploadBytes ?? MAX_UPLOAD_BYTES;
      const maxLabel = overview?.limits.maxUploadLabel ?? `${Math.floor(maxBytes / (1024 * 1024))} MB`;
      let document = picked.document;

      recordUploadDiagnostic({
        step: 'picked',
        uriScheme: uriScheme(document.uri),
        extension: extensionOnly(document.name),
        mimeType: document.mimeType ?? 'none',
        sizeBytes: typeof document.sizeBytes === 'number' ? document.sizeBytes : undefined,
      });

      const plan = planImageOptimization({
        mimeType: document.mimeType,
        name: document.name,
        sizeBytes: document.sizeBytes,
        maxBytes,
      });

      recordUploadDiagnostic({
        step: 'plan',
        detail: plan.action === 'OPTIMIZE' ? 'optimize' : plan.reason.toLowerCase(),
      });

      if (plan.action === 'OPTIMIZE') {
        setUploadState((prev) => ({ ...prev, [slotId]: { kind: 'preparing' } }));
        const outcome = await optimizeImageForUpload({
          uri: document.uri,
          name: document.name,
          plan,
          maxBytes,
          readSize: readFileSize,
        });

        if (outcome.state === 'optimized') {
          document = outcome.image;
        } else if (outcome.state === 'still_too_large') {
          // The ladder bottomed out at a resolution that is still readable. Asking for a different
          // photo is the honest answer; grinding further would upload something nobody can review.
          setUploadState((prev) => ({
            ...prev,
            [slotId]: { kind: 'failed', message: stillTooLargeMessage(maxLabel) },
          }));
          return;
        } else if (outcome.state === 'unreadable_output') {
          /*
           * The encoder said it wrote a file and the filesystem cannot measure it. Nothing is wrong
           * with the photo, so "retake it" would waste their time -- and sending a file we could not
           * stat is how a request dies in the native layer with no usable error at all.
           */
          setUploadState((prev) => ({
            ...prev,
            [slotId]: { kind: 'failed', message: "Zoey couldn't prepare that photo. Try taking a new one." },
          }));
          return;
        } else if (outcome.state === 'failed') {
          /*
           * The encoder could not read it. That is either a corrupt image or something that was
           * never an image -- and either way the fact the person needs is the one they started
           * with: it is over the limit. Blaming "that photo" would be a guess about which.
           */
          setUploadState((prev) => ({
            ...prev,
            [slotId]: { kind: 'failed', message: tooLargeMessage(maxLabel) },
          }));
          return;
        }

        /*
         * THE FILE HAS TO BE THERE BEFORE IT IS SENT.
         *
         * A FormData part naming an unreadable URI does not fail loudly -- fetch throws something
         * generic and the person retries a file that was never going to send. Asking first turns
         * that into an answer they can act on. A filesystem that cannot answer at all does not
         * block: unknown is not the same as missing.
         */
        const onDisk = await readableFileSize(document.uri);
        recordUploadDiagnostic({
          step: 'output-check',
          sizeBytes: typeof onDisk === 'number' ? onDisk : undefined,
          detail: onDisk === null ? 'unmeasurable' : onDisk > 0 ? 'present' : 'missing-or-empty',
          uriScheme: uriScheme(document.uri),
        });

        if (onDisk === 0) {
          setUploadState((prev) => ({
            ...prev,
            [slotId]: { kind: 'failed', message: "Zoey couldn't prepare that photo. Try taking a new one." },
          }));
          return;
        }
      }

      setUploadState((prev) => ({ ...prev, [slotId]: { kind: 'uploading' } }));
      /*
       * The engine's own maximum when the overview has been read, so the phone checks against what
       * the server actually enforces rather than a number compiled into the app months ago.
       */
      const result = await uploadDocumentToEngine(slotId, document, maxBytes);

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
    // `overview` carries the engine's own upload limit; without it here this closure keeps the
    // value from the first render, which is null, and silently falls back to the compiled-in one.
    [refresh, overview]
  );

  const applyRun = useCallback(
    (stage: RunStageId, outcome: RunOutcome, message: string) => {
      setStages(stagesFrom(stage, outcome));
      setCurrentMilestone(stage);
      setBlockedReason(outcome === 'READY' || outcome === 'ALREADY_RUNNING' ? undefined : message);
    },
    []
  );

  const runZoey = useCallback(async (mode: 'START' | 'RERUN' = 'START') => {
    // Set before the first await, so a second tap in the same frame sees it.
    if (runInFlight.current) return;
    runInFlight.current = true;

    setRunState('starting');
    workingSince.current = Date.now();
    setStages({ ...ALL_PENDING });
    setBlockedReason(undefined);
    setCurrentMilestone(RUN_STAGES[0].id);

    try {
      const result = await runZoeyOnEngine(mode);
      applyRun(result.stage, result.outcome, result.message);

      if (result.outcome === 'BLOCKED') setRunState('attention');
      else if (result.outcome === 'UNAVAILABLE') setRunState('failed');
      else if (result.outcome === 'ALREADY_RUNNING') setRunState('working');
      else setRunState('idle');

      // A terminal answer ends the claim; only ALREADY_RUNNING leaves one for polling to resolve.
      if (result.outcome !== 'ALREADY_RUNNING') workingSince.current = null;

      /*
       * ALWAYS released. It guards the request, not the run.
       *
       * Holding it across an ALREADY_RUNNING response was the deadlock: the reconciliation effect
       * refuses to act while it is set, so the phone kept asserting "Zoey is working" and had
       * disabled the only mechanism that could ever have contradicted it. A duplicate tap is now
       * refused by the state on screen and by the engine's own run lock -- both of which can change
       * their minds, which a latched ref cannot.
       */
      runInFlight.current = false;

      // Intake and analysis state both move as a result of a run, so re-read both.
      await refresh();
    } catch {
      setRunState('failed');
      workingSince.current = null;
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
