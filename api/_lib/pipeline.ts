/**
 * The analysis pipeline definition. The SERVER owns this, not the app -- the
 * app renders whatever stages the status endpoint reports, so changing the
 * pipeline here does not require an app release.
 */

export const STAGES = [
  { id: 'received', label: 'Documents Received', ms: 900 },
  { id: 'extracting', label: 'Extracting Key Information', ms: 2200 },
  { id: 'identity', label: 'Validating Identity Information', ms: 1900 },
  { id: 'credit-report', label: 'Reading Credit Report', ms: 2600 },
  { id: 'bureau', label: 'Cross-Checking Bureau Data', ms: 2400 },
  { id: 'derogatory', label: 'Detecting Accounts / Derogatory Info', ms: 2100 },
  { id: 'case-profile', label: 'Building Case Profile', ms: 1800 },
  { id: 'complete', label: 'Analysis Complete', ms: 600 },
] as const;

export type StageId = (typeof STAGES)[number]['id'];
export type StageState = 'pending' | 'active' | 'done' | 'failed';
export type JobStatus = 'running' | 'complete' | 'failed';

/** The intake set required before analysis may start. Enforced server-side. */
export const REQUIRED_DOC_IDS = ['ssn', 'photo-id', 'proof-address', 'credit-report'] as const;

export const TOTAL_MS = STAGES.reduce((sum, s) => sum + s.ms, 0);

/**
 * Stage states for a job, derived from how long it has been running.
 *
 * Deriving from `startedAt` rather than mutating a row per tick is what makes
 * this correct on serverless: there is no background worker between requests,
 * and any instance can answer a status call without having handled the start.
 *
 * ---------------------------------------------------------------------------
 * STUB PIPELINE. The timings below stand in for work that is not implemented --
 * nothing here reads a document. When real analysis lands, replace this
 * function with a read of the job's actual per-stage state; `deriveStages` is
 * the only thing that has to change, and the app needs no update at all.
 * ---------------------------------------------------------------------------
 */
export function deriveStages(elapsedMs: number): Record<StageId, StageState> {
  const out = {} as Record<StageId, StageState>;
  let cursor = 0;

  for (const stage of STAGES) {
    const start = cursor;
    const end = cursor + stage.ms;

    if (elapsedMs >= end) out[stage.id] = 'done';
    else if (elapsedMs >= start) out[stage.id] = 'active';
    else out[stage.id] = 'pending';

    cursor = end;
  }

  return out;
}

export function statusFromStages(stages: Record<StageId, StageState>): JobStatus {
  if (STAGES.some((s) => stages[s.id] === 'failed')) return 'failed';
  return stages.complete === 'done' ? 'complete' : 'running';
}
