import { STAGES, type StageId, type StageState } from './pipeline.js';

/**
 * Credit Services milestones: the coarse, membership-independent view.
 *
 * Basic Credit Services are NOT a paid feature, so every client -- free or
 * member -- is entitled to know where their service stands. What membership
 * buys is the software experience around it: per-stage timelines, dates,
 * tracking and Zoey's commentary.
 *
 * So the server derives a small set of milestones here and returns ONLY these
 * to a free client. The detailed `stages` map is withheld at the API, not
 * hidden in the UI -- calling the endpoint directly gets a free client the same
 * coarse view the app shows them.
 */

export type MilestoneId =
  | 'documents-needed'
  | 'documents-received'
  | 'in-review'
  | 'dispute-prepared'
  | 'dispute-sent'
  | 'result-available';

export type Milestone = { id: MilestoneId; label: string; state: 'done' | 'current' | 'pending' };

const LABELS: Record<MilestoneId, string> = {
  'documents-needed': 'Documents Needed',
  'documents-received': 'Documents Received',
  'in-review': 'Credit Services Review',
  'dispute-prepared': 'Dispute Prepared',
  'dispute-sent': 'Dispute Sent',
  'result-available': 'Result Available',
};

const ORDER: MilestoneId[] = [
  'documents-received',
  'in-review',
  'dispute-prepared',
  'dispute-sent',
  'result-available',
];

/**
 * Which detailed stage completing marks each milestone reached.
 *
 * Sending and results are owner-side steps with no data source yet, so they
 * stay pending rather than being inferred from the analyzer.
 */
const REACHED_BY: Partial<Record<MilestoneId, StageId>> = {
  'documents-received': 'received',
  'in-review': 'extracting',
  'dispute-prepared': 'case-profile',
};

export function milestonesFromStages(
  stages: Record<string, StageState> | null,
  intakeComplete: boolean
): Milestone[] {
  if (!intakeComplete) {
    return [
      { id: 'documents-needed', label: LABELS['documents-needed'], state: 'current' },
      ...ORDER.map((id) => ({ id, label: LABELS[id], state: 'pending' as const })),
    ];
  }

  const done = (stage: StageId | undefined) => Boolean(stage && stages?.[stage] === 'done');

  let firstPending = true;
  return ORDER.map((id) => {
    const reached = done(REACHED_BY[id]);
    if (reached) return { id, label: LABELS[id], state: 'done' as const };
    if (firstPending) {
      firstPending = false;
      return { id, label: LABELS[id], state: 'current' as const };
    }
    return { id, label: LABELS[id], state: 'pending' as const };
  });
}

/** One-line summary for a free client, e.g. "Credit Services Review". */
export function currentMilestoneLabel(milestones: Milestone[]): string {
  return (
    milestones.find((m) => m.state === 'current')?.label ??
    milestones.filter((m) => m.state === 'done').pop()?.label ??
    LABELS['documents-needed']
  );
}

/** Guards against a stage id drifting out of the pipeline unnoticed. */
export function assertMilestoneMapping(): string[] {
  const known = new Set<string>(STAGES.map((s) => s.id));
  return Object.values(REACHED_BY).filter((id): id is StageId => Boolean(id) && !known.has(id));
}
