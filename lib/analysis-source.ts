import { requireApiBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';

/**
 * Zoey's analysis pipeline as the app sees it.
 *
 * The stage list here is only a fallback for labels and ordering -- the server
 * reports its own stage ids and labels, and the UI renders what it is told.
 * Progress is the share of stages the server has reported done; the app never
 * invents or interpolates a percentage.
 */

/** Fallback ordering/labels, used before the first response arrives. */
export const ANALYSIS_STAGES = [
  { id: 'received', label: 'Documents Received' },
  { id: 'extracting', label: 'Extracting Key Information' },
  { id: 'identity', label: 'Validating Identity Information' },
  { id: 'credit-report', label: 'Reading Credit Report' },
  { id: 'bureau', label: 'Cross-Checking Bureau Data' },
  { id: 'derogatory', label: 'Detecting Accounts / Derogatory Info' },
  { id: 'case-profile', label: 'Building Case Profile' },
  { id: 'complete', label: 'Analysis Complete' },
] as const;

export type StageId = (typeof ANALYSIS_STAGES)[number]['id'];
export type StageState = 'pending' | 'active' | 'done' | 'failed';

export type AnalysisPhase =
  | 'DOCUMENTS_INCOMPLETE'
  | 'DOCUMENTS_READY'
  | 'ANALYSIS_RUNNING'
  | 'ANALYSIS_COMPLETE'
  | 'ANALYSIS_FAILED';

/** Coarse Credit Services milestone -- returned to every tier. */
export type Milestone = {
  id: string;
  label: string;
  state: 'done' | 'current' | 'pending';
};

export type AnalysisUpdate = {
  stages: Record<string, StageState>;
  /** Always present. The only progress view a free client receives. */
  milestones?: Milestone[];
  currentMilestone?: string;
  /** Terminal state as reported by the server, when it reports one. */
  status?: 'running' | 'complete' | 'failed';
  /** Server-owned labels, so renaming a stage needs no app release. */
  labels?: Record<string, string>;
  /** Ordering, as reported. Falls back to ANALYSIS_STAGES. */
  order?: string[];
  blockedReason?: string;
};

/**
 * The integration seam. `run` starts analysis and pushes an update whenever the
 * backend's status changes; the returned teardown must stop all work, and is
 * called on unmount.
 */
export type AnalysisSource = {
  run(onUpdate: (update: AnalysisUpdate) => void): () => void;
};

export const ALL_PENDING: Record<string, StageState> = Object.fromEntries(
  ANALYSIS_STAGES.map((s) => [s.id, 'pending'])
);

/** Progress is the share of stages actually reported done -- never a guess. */
export function progressFromStages(stages: Record<string, StageState>) {
  const ids = Object.keys(stages);
  if (ids.length === 0) return 0;
  const done = ids.filter((id) => stages[id] === 'done').length;
  return done / ids.length;
}

export function phaseFromStages(
  stages: Record<string, StageState>,
  status?: string
): AnalysisPhase {
  if (status === 'failed') return 'ANALYSIS_FAILED';
  if (status === 'complete') return 'ANALYSIS_COMPLETE';
  if (Object.values(stages).some((s) => s === 'failed')) return 'ANALYSIS_FAILED';
  if (stages.complete === 'done') return 'ANALYSIS_COMPLETE';
  return 'ANALYSIS_RUNNING';
}

/**
 * Base URL comes from the one canonical resolver. It is read at request time,
 * not at module load, so a configuration problem surfaces as a handled error in
 * the UI rather than throwing while the module is being evaluated.
 */
export { API_BASE_URL } from '@/lib/api-config';

type StatusResponse = {
  jobId: string;
  status: 'running' | 'complete' | 'failed';
  /** Member-only. Absent for a free client -- the server withholds it. */
  stages?: Record<string, StageState>;
  labels?: Record<string, string>;
  milestones?: Milestone[];
  currentMilestone?: string;
  blockedReason?: string;
};

export type { StatusResponse };

/** Registers a filled intake slot with the server. */
export async function uploadDocument(slotId: string, filename?: string) {
  const res = await authenticatedFetch(`${requireApiBaseUrl()}/api/documents/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slotId, filename }),
  });
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
  return (await res.json()) as { docId: string; slotId: string; receivedAt: number };
}

const POLL_MS = 900;

/**
 * The real source: POST /api/analysis/start, then poll GET /api/analysis/:jobId
 * until the job reaches a terminal state.
 *
 * Failures surface as ANALYSIS_FAILED with a readable `blockedReason` rather
 * than being swallowed -- an unreachable analyzer is something the client needs
 * told, and it must never look like progress.
 */
export function createHttpAnalysisSource(configuredBaseUrl?: string): AnalysisSource {
  return {
    run(onUpdate) {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      // Resolved here rather than as a default parameter: a misconfigured base
      // must become a visible ANALYSIS_FAILED state, not an exception thrown
      // while the provider is constructing its source.
      let baseUrl: string;
      try {
        baseUrl = configuredBaseUrl ?? requireApiBaseUrl();
      } catch (err) {
        onUpdate({
          stages: { ...ALL_PENDING, received: 'failed' },
          status: 'failed',
          blockedReason: err instanceof Error ? err.message : 'Zoey\'s API is not configured.',
        });
        return () => {};
      }

      const fail = (reason: string) => {
        if (cancelled) return;
        onUpdate({
          stages: { ...ALL_PENDING, received: 'failed' },
          status: 'failed',
          blockedReason: reason,
        });
      };

      const poll = async (jobId: string) => {
        if (cancelled) return;

        try {
          const res = await authenticatedFetch(`${baseUrl}/api/analysis/${encodeURIComponent(jobId)}`);
          if (!res.ok) {
            fail(`Zoey's analyzer returned ${res.status}. Please try again.`);
            return;
          }

          const data = (await res.json()) as StatusResponse;
          if (cancelled) return;

          // `stages` is member-only; a free client gets milestones instead.
          // Falling back to ALL_PENDING keeps every consumer's shape stable.
          const stages = data.stages ?? ALL_PENDING;
          onUpdate({
            stages,
            status: data.status,
            labels: data.labels,
            order: data.stages ? Object.keys(data.stages) : undefined,
            milestones: data.milestones,
            currentMilestone: data.currentMilestone,
            blockedReason: data.blockedReason,
          });

          // Stop polling once terminal; nothing further will change.
          if (data.status === 'running') {
            timer = setTimeout(() => poll(jobId), POLL_MS);
          }
        } catch {
          fail("Can't reach Zoey's analyzer. Check your connection and try again.");
        }
      };

      (async () => {
        try {
          const res = await authenticatedFetch(`${baseUrl}/api/analysis/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          if (res.status === 409) {
            const body = (await res.json()) as { missing?: string[] };
            fail(
              `Zoey still needs: ${(body.missing ?? []).join(', ') || 'more documents'}. Your uploaded documents are safe.`
            );
            return;
          }

          if (!res.ok) {
            fail(`Zoey could not start the analysis (${res.status}). Please try again.`);
            return;
          }

          const { jobId } = (await res.json()) as { jobId: string };
          await poll(jobId);
        } catch {
          fail("Can't reach Zoey's analyzer. Check your connection and try again.");
        }
      })();

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    },
  };
}
