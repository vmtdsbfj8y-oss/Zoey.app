/**
 * Stage vocabulary for Zoey's own API.
 *
 * ==========================  WHAT LEFT THIS FILE  ==========================
 *
 * The timings did. Every stage used to carry an `ms`, and `deriveStages(elapsed)` turned a
 * stopwatch into a progress report -- the screen advanced through "Reading Credit Report" whether
 * or not a report existed. Analysis now runs in the credit engine and the app reads real stages
 * from `/api/mobile/run` and `/api/mobile/overview`, so there is nothing here to derive.
 *
 * What remains is vocabulary: stage ids that other copy in this service still refers to, and the
 * intake set. Neither drives progress.
 *
 * ==========================  WHERE DOCUMENTS LIVE NOW  ==========================
 *
 * Not here. This service no longer accepts uploads -- report bytes go to the engine, which stores
 * them privately and is the authority on which requirements are satisfied. `REQUIRED_DOC_IDS` is
 * kept for the copy that names the intake set; it is not a second record of what has arrived.
 */

export const STAGES = [
  { id: 'received', label: 'Documents Received' },
  { id: 'extracting', label: 'Extracting Key Information' },
  { id: 'identity', label: 'Validating Identity Information' },
  { id: 'credit-report', label: 'Reading Credit Report' },
  { id: 'bureau', label: 'Cross-Checking Bureau Data' },
  { id: 'derogatory', label: 'Detecting Accounts / Derogatory Info' },
  { id: 'case-profile', label: 'Building Case Profile' },
  { id: 'complete', label: 'Analysis Complete' },
] as const;

export type StageId = (typeof STAGES)[number]['id'];
export type StageState = 'pending' | 'active' | 'done' | 'failed';
export type JobStatus = 'running' | 'complete' | 'failed';

/** The intake set Zoey asks for. The engine decides whether each is satisfied. */
export const REQUIRED_DOC_IDS = ['ssn', 'photo-id', 'proof-address', 'credit-report'] as const;
