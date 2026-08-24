import type { MobileOverview } from '@/lib/mobile-api';
import { tr } from './i18n/runtime';
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
/**
 * Report factors, counted from the report's OWN words.
 *
 * Each row below matches on `accountStatus` / `accountType` -- the strings the bureau printed, not
 * a classification invented here. "Collections" counts accounts the report itself calls a
 * collection; it is reading, not inferring.
 *
 * HARD INQUIRIES ARE ABSENT, and deliberately so: no payload the app receives carries them. A
 * count of zero would say the report has none, which is a different statement from "we cannot see
 * them", and it is the wrong one.
 *
 * None of these is a scoring reason. A bureau's model assigns its own factors and this app cannot
 * see them, so the section says what is ON the report and never why a score is what it is.
 */
export interface ReportFactor {
  key: string;
  label: string;
  icon: string;
  count: number;
}

const FACTOR_MATCHERS: { key: string; label: string; icon: string; test: RegExp }[] = [
  { key: 'collections', label: 'Collections', icon: 'exclamationmark.triangle.fill', test: /collection/i },
  { key: 'chargeOff', label: 'Charge-offs', icon: 'xmark.circle.fill', test: /charge[-\s]?off/i },
  { key: 'late', label: 'Late payments', icon: 'clock.fill', test: /late|past due|delinquen/i },
];

export function reportFactors(results: MobileResults | null): ReportFactor[] {
  const accounts = results?.accounts ?? [];
  if (accounts.length === 0) return [];

  const factors = FACTOR_MATCHERS.map((matcher) => ({
    key: matcher.key,
    label: matcher.label,
    icon: matcher.icon,
    /*
     * The creditor field is searched too. A report naming a tradeline "COLLECTION ****1983" puts
     * the word there and nowhere else, and matching only type and status returned nothing for a
     * file with two collections on it. Still only what the report printed -- and it inherits that
     * field's imprecision, so a retailer named "Collections Etc" would be counted.
     */
    count: accounts.filter((account) =>
      matcher.test.test(`${account.creditor ?? ''} ${account.accountType ?? ''} ${account.accountStatus ?? ''}`)
    ).length,
  })).filter((factor) => factor.count > 0);

  /*
   * The engine's own count of harmful accounts, kept last so it reads as the summary line rather
   * than as another category. It is not the sum of the rows above -- one account can be both a
   * collection and a charge-off -- and presenting it as a total would invite that arithmetic.
   */
  const problems = results?.summary.problemAccounts ?? 0;
  if (problems > 0) {
    factors.push({ key: 'negative', label: 'Accounts needing work', icon: 'flag.fill', count: problems });
  }
  return factors;
}

export const UNAVAILABLE_METRICS = [
  'Credit utilization',
  tr('facts.paymentHistoryPct'),
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
    ? tr('facts.stillWorking')
    : tr('facts.availableAfter');

  /*
   * THREE, NOT FOUR, AND NAMED FOR WHAT THEY MEAN.
   *
   * The first version showed every count the summary carried, which is how a consumer screen ends
   * up reading as an admin panel: "Accounts reviewed / Accounts with problems / Ready to dispute /
   * Needs attention" is a database query rendered as a grid. A person wants to know how much was
   * looked at, how much is wrong, and how much is moving.
   */
  const facts: CreditFact[] = [
    {
      label: 'Accounts reviewed',
      value: summary?.accountsReviewed ?? null,
      availability: summary ? 'AVAILABLE' : pending,
      note,
    },
    {
      label: 'Negative items',
      value: summary?.problemAccounts ?? null,
      availability: summary ? 'AVAILABLE' : pending,
      note,
    },
    {
      label: 'Ready for action',
      value: summary?.disputeReady ?? null,
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
      headline: tr('facts.waitingReport'),
      detail: tr('facts.waitingReportBody'),
      actionRequired: false,
    };
  }
  return {
    headline: 'Zoey is working',
    detail: 'She is reading your report account by account. Results appear here as she finishes.',
    actionRequired: false,
  };
}
