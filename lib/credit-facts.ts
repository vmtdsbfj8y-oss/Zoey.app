import type { MobileOverview } from '@/lib/mobile-api';
import type { MobileResults } from '@/lib/mobile-results';

/**
 * What Zoey can actually say about a client's credit, and what she cannot.
 *
 * ==============================  WHY THIS EXISTS  ==============================
 *
 * Two screens want to show credit health, and the fastest way to build either is to reach for the
 * numbers a credit app is "supposed" to have -- utilization, payment history, account age, a score
 * change since last month. This backend exposes none of those. A component that reaches for them
 * finds undefined, and the natural repair is a fallback: a zero, a dash, a "0%". Every one of
 * those reads to a client as a fact about their credit.
 *
 * So availability is modelled explicitly. A metric is either present with a real value, or it is
 * `null` and the UI owns an intentional empty state. There is no third option and no default.
 *
 * ==============================  WHAT IS DELIBERATELY ABSENT  ==============================
 *
 * `UNAVAILABLE_METRICS` is the honest list. It is exported so the screens can SAY what Zoey does
 * not know yet, rather than quietly omitting it and leaving a client to assume it was checked and
 * found fine. When the backend grows one of these, it moves out of that list and into this shape,
 * and the components already handle it.
 */

export type FactAvailability = 'AVAILABLE' | 'NOT_YET_ANALYSED' | 'NOT_IN_REPORT_DATA';

export interface CreditFact {
  label: string;
  value: number | null;
  availability: FactAvailability;
  /** Plain sentence for the empty state. Never a guess at what the value would be. */
  note: string;
}

/**
 * Metrics a credit app is expected to show and this backend does not produce.
 *
 * Listed rather than silently skipped. Each would have to be derived from tradeline data, and
 * deriving a scoring factor from tradelines is exactly the inference the engine refuses to make --
 * a bureau's model assigns its own reasons, and guessing them would be this app inventing why a
 * score is what it is.
 */
export const UNAVAILABLE_METRICS = [
  'Credit utilization',
  'Payment history percentage',
  'Average account age',
  'Credit mix',
  'Total balances',
] as const;

export interface CreditFacts {
  /** True once analysis has produced account-level results. */
  analysed: boolean;
  analysisState: MobileResults['summary']['analysisState'] | 'NOT_STARTED';
  facts: CreditFact[];
  /** The engine's own sentence about what is happening now. Never composed here. */
  currentWork: { headline: string; detail: string; actionRequired: boolean } | null;
  disputeRound: number;
  reportReceivedAt: string | null;
  /** Accounts grouped by the engine's own outcome vocabulary. Counts only. */
  outcomeCounts: { outcome: string; label: string; count: number }[];
}

const OUTCOME_LABEL: Record<string, string> = {
  DELETION_FOCUSED: 'Deletion requested',
  DISPUTE_READY: 'Dispute ready',
  PRESERVE_ACCOUNT: 'Correction requested',
  NEEDS_EVIDENCE: 'Needs evidence',
  NEEDS_YOUR_CONFIRMATION: 'Needs your answer',
  NO_ACTION: 'No action needed',
};

/**
 * Builds the facts from the two canonical payloads. Adds nothing, derives nothing.
 *
 * Every number below is one the engine already computed and sent. Where a payload is missing --
 * results not loaded, analysis not run -- the fact is NOT_YET_ANALYSED rather than zero, because
 * "no problem accounts" and "we have not looked yet" are opposite statements and a zero says the
 * wrong one.
 */
export function buildCreditFacts(input: {
  overview: MobileOverview | null;
  results: MobileResults | null;
}): CreditFacts {
  const { overview, results } = input;
  const summary = results?.summary ?? null;
  const analysed = summary?.analysisState === 'COMPLETE' || summary?.analysisState === 'NEEDS_ATTENTION';

  const pending: FactAvailability = summary ? 'NOT_YET_ANALYSED' : 'NOT_YET_ANALYSED';
  const note = summary
    ? 'Zoey is still working through your report.'
    : 'Available once Zoey has analyzed your report.';

  const facts: CreditFact[] = [
    {
      label: 'Accounts reviewed',
      value: summary?.accountsReviewed ?? null,
      availability: summary ? 'AVAILABLE' : pending,
      note,
    },
    {
      label: 'Accounts with problems',
      value: summary?.problemAccounts ?? null,
      availability: summary ? 'AVAILABLE' : pending,
      note,
    },
    {
      label: 'Ready to dispute',
      value: summary?.disputeReady ?? null,
      availability: summary ? 'AVAILABLE' : pending,
      note,
    },
    {
      label: 'Needs attention',
      value: summary?.needsAttention ?? null,
      availability: summary ? 'AVAILABLE' : pending,
      note,
    },
  ];

  /*
   * Grouped by the engine's OWN outcome for each account. Not a classification invented here: the
   * outcome is the word the strategy stage used, and the count is how many accounts carry it.
   */
  const counts = new Map<string, number>();
  for (const account of results?.accounts ?? []) {
    counts.set(account.outcome, (counts.get(account.outcome) ?? 0) + 1);
  }

  return {
    analysed,
    analysisState: summary?.analysisState ?? 'NOT_STARTED',
    facts,
    currentWork: results?.clientState
      ? {
          headline: results.clientState.headline,
          detail: results.clientState.detail,
          actionRequired: results.clientState.clientActionRequired,
        }
      : null,
    disputeRound: summary?.disputeRound ?? overview?.disputes.round ?? 0,
    reportReceivedAt: overview?.scores[0]?.reportReceivedAt ?? overview?.report.receivedAt ?? null,
    outcomeCounts: [...counts.entries()]
      .map(([outcome, count]) => ({ outcome, label: OUTCOME_LABEL[outcome] ?? outcome, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * The one-line summary of what Zoey is doing, for the hero.
 *
 * Returns the ENGINE's sentence when there is one. It composes nothing and calls no model: a
 * "Zoey insight" written on the phone would be this app's opinion wearing her name, and the
 * sentences the engine already produces are the ones tied to what the case actually holds.
 */
export function zoeyInsight(facts: CreditFacts): { headline: string; detail: string; actionRequired: boolean } {
  if (facts.currentWork) return facts.currentWork;

  if (facts.analysisState === 'NOT_STARTED') {
    return {
      headline: 'Waiting on your report',
      detail: 'Once your credit report is in, Zoey reads every account and tells you what she finds.',
      actionRequired: false,
    };
  }
  return {
    headline: 'Zoey is working',
    detail: 'She is reading your report account by account. Results appear here as she finishes.',
    actionRequired: false,
  };
}
