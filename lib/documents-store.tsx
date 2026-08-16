import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  ALL_PENDING,
  ANALYSIS_STAGES,
  createHttpAnalysisSource,
  phaseFromStages,
  progressFromStages,
  uploadDocument,
  type AnalysisPhase,
  type AnalysisSource,
  type StageState,
} from '@/lib/analysis-source';
import { documentSlots, type DocumentSlot } from '@/lib/documents-data';

/**
 * Single source of truth for the Documents screen: which slots are filled,
 * whether intake is complete, and where analysis has got to.
 *
 * Analysis state comes entirely from the injected `AnalysisSource` -- by
 * default the HTTP one in `lib/analysis-source.ts`, which talks to the API in
 * `api/` of this repo. Nothing here fabricates progress.
 */

/**
 * The intake set Zoey needs before she can run. The SERVER enforces this too
 * (see api/analysis/start.ts); this copy exists so the UI can gate the hero
 * without a round trip, not as the authority.
 */
export const REQUIRED_DOC_IDS = ['ssn', 'photo-id', 'proof-address', 'credit-report'] as const;

type StageDescriptor = { id: string; label: string };

type DocumentsContextValue = {
  slots: DocumentSlot[];
  missing: DocumentSlot[];
  requiredComplete: boolean;

  phase: AnalysisPhase;
  stages: Record<string, StageState>;
  /** Ordered stage list with labels, server-reported when available. */
  stageList: StageDescriptor[];
  /** 0..1, derived from stages actually reported done. */
  progress: number;
  blockedReason?: string;

  markUploaded: (id: string) => void;
  markPending: (id: string) => void;
  runZoey: () => void;
  retry: () => void;
};

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

const FALLBACK_STAGES: StageDescriptor[] = ANALYSIS_STAGES.map((s) => ({
  id: s.id,
  label: s.label,
}));

export function DocumentsProvider({
  children,
  source,
}: {
  children: React.ReactNode;
  /** Override for tests, or to point at a different analyzer. */
  source?: AnalysisSource;
}) {
  const [slots, setSlots] = useState<DocumentSlot[]>(documentSlots);
  const [started, setStarted] = useState(false);
  const [stages, setStages] = useState<Record<string, StageState>>({ ...ALL_PENDING });
  const [stageList, setStageList] = useState<StageDescriptor[]>(FALLBACK_STAGES);
  const [status, setStatus] = useState<string | undefined>();
  const [blockedReason, setBlockedReason] = useState<string | undefined>();

  // Held in a ref so swapping the prop mid-run cannot restart an in-flight
  // analysis; the effect below keys off `started` alone.
  const sourceRef = useRef<AnalysisSource>(source ?? createHttpAnalysisSource());
  useEffect(() => {
    if (source) sourceRef.current = source;
  }, [source]);

  const missing = useMemo(
    () =>
      slots.filter(
        (s) => (REQUIRED_DOC_IDS as readonly string[]).includes(s.id) && s.state !== 'uploaded'
      ),
    [slots]
  );
  const requiredComplete = missing.length === 0;

  // Intake going incomplete again (a re-upload) cancels a run rather than
  // leaving analysis pointing at documents that are no longer there.
  useEffect(() => {
    if (!requiredComplete && started) {
      setStarted(false);
      setStages({ ...ALL_PENDING });
      setStatus(undefined);
      setBlockedReason(undefined);
    }
  }, [requiredComplete, started]);

  useEffect(() => {
    if (!started) return;

    const stop = sourceRef.current.run((update) => {
      setStages(update.stages);
      setStatus(update.status);
      setBlockedReason(update.blockedReason);

      // Prefer the server's own stage naming and ordering.
      const order = update.order ?? Object.keys(update.stages);
      if (order.length > 0) {
        setStageList(
          order.map((id) => ({
            id,
            label:
              update.labels?.[id] ??
              FALLBACK_STAGES.find((s) => s.id === id)?.label ??
              id,
          }))
        );
      }
    });

    // Teardown is the source's responsibility to honour -- without this a
    // polling source keeps running after the screen unmounts.
    return stop;
  }, [started]);

  const markUploaded = useCallback((id: string) => {
    // Optimistic: the row flips immediately, then we register it server-side.
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, state: 'uploaded', detail: 'Uploaded just now' } : s))
    );
    uploadDocument(id).catch((err) => {
      console.warn(`[zoey] could not register "${id}" with the API:`, err?.message ?? err);
    });
  }, []);

  const markPending = useCallback((id: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, state: 'pending', detail: documentSlots.find((d) => d.id === id)!.detail }
          : s
      )
    );
  }, []);

  const runZoey = useCallback(() => {
    setStages({ ...ALL_PENDING });
    setStatus(undefined);
    setBlockedReason(undefined);
    setStarted(true);
  }, []);

  const retry = useCallback(() => {
    setStages({ ...ALL_PENDING });
    setStatus(undefined);
    setBlockedReason(undefined);
    setStarted(false);
    // Next tick, so the source's teardown runs before a fresh run starts.
    setTimeout(() => setStarted(true), 0);
  }, []);

  const phase: AnalysisPhase = !requiredComplete
    ? 'DOCUMENTS_INCOMPLETE'
    : !started
      ? 'DOCUMENTS_READY'
      : phaseFromStages(stages, status);

  const value = useMemo(
    () => ({
      slots,
      missing,
      requiredComplete,
      phase,
      stages,
      stageList,
      progress: progressFromStages(stages),
      blockedReason,
      markUploaded,
      markPending,
      runZoey,
      retry,
    }),
    [
      slots,
      missing,
      requiredComplete,
      phase,
      stages,
      stageList,
      blockedReason,
      markUploaded,
      markPending,
      runZoey,
      retry,
    ]
  );

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used inside <DocumentsProvider>');
  return ctx;
}
