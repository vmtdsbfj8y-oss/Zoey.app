import { requireEngineBaseUrl } from '@/lib/api-config';
import { tr } from './i18n/runtime';
import { authenticatedFetch } from '@/lib/auth-fetch';

/**
 * The engine's results, as the app reads them.
 *
 * ==========================  EVERYTHING HERE IS THE SERVER'S  ==========================
 *
 * No outcome is computed on the device and no label is written here: `outcomeLabel` and `nextStep`
 * arrive already worded from the projection, which chose them from a closed set. If a sentence
 * needs to change it changes there, where the engine's own vocabulary is in view -- rewording a
 * decision on the phone is how an app ends up describing something the case does not say.
 *
 * Nothing is cached. A relaunch re-reads, so what is on screen is what the engine holds now.
 */

export type MobileAccountOutcome =
  | 'DELETION_FOCUSED'
  | 'PRESERVE_ACCOUNT'
  | 'DISPUTE_READY'
  | 'NEEDS_EVIDENCE'
  | 'NEEDS_YOUR_CONFIRMATION'
  | 'NO_ACTION';

export type MobileAccountResult = {
  creditor: string;
  accountMask: string | null;
  accountType: string | null;
  accountStatus: string | null;
  bureaus: string[];
  outcome: MobileAccountOutcome;
  outcomeLabel: string;
  nextStep: string | null;
  /** The objective, e.g. "Deletion". Null when the engine records none. */
  target?: string | null;
  /** What is happening now, e.g. "Validation / evidence". */
  currentStep?: string | null;
};

export type MobileDisputeState = {
  /** NONE | BLOCKED | READY_TO_SIGN | SIGNED */
  status: string;
  createdAt: string | null;
  signedAt: string | null;
  blockers: string[];
  letters: { title: string }[];
};

/**
 * The single client-facing state for the whole Disputes screen, decided server-side.
 *
 * The app renders this and does not recompute it. Three sources of truth on one screen is how it
 * came to say "nothing else is needed from you" directly above "waiting on signature".
 */
export type MobileClientStateView = {
  state:
    | 'CLIENT_QUESTIONS_REQUIRED'
    | 'DOCUMENTS_HELD'
    | 'READY_TO_SIGN'
    | 'SIGNED_WAITING_OWNER'
    | 'OWNER_REVIEW'
    | 'ZOEY_WORKING'
    | 'NOTHING_REQUIRED';
  headline: string;
  detail: string;
  clientActionRequired: boolean;
  signatureAvailable: boolean;
  documentsHeld: number;
};

export type MobileResults = {
  version: 'mobile-results-v1';
  summary: {
    analysisState: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'NEEDS_ATTENTION';
    accountsReviewed: number;
    problemAccounts: number;
    disputeReady: number;
    needsAttention: number;
    disputeRound: number;
  };
  accounts: MobileAccountResult[];
  disputes: MobileDisputeState;
  /** Optional so an older engine simply yields no headline rather than a wrong one. */
  clientState?: MobileClientStateView;
};

export type ResultsState =
  | { status: 'LOADING' }
  | { status: 'READY'; results: MobileResults }
  /** Not linked, not reachable, or the server could not answer. Never rendered as "no results". */
  | { status: 'UNAVAILABLE'; message: string };

export async function getMobileResults(): Promise<ResultsState> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return { status: 'UNAVAILABLE', message: err instanceof Error ? err.message : tr('lib.notConfigured') };
  }

  try {
    const res = await authenticatedFetch(`${baseUrl}/api/mobile/results`);
    if (!res.ok) {
      return { status: 'UNAVAILABLE', message: "Zoey couldn't load your results right now." };
    }
    const results = (await res.json()) as MobileResults;
    if (results.version !== 'mobile-results-v1') {
      return { status: 'UNAVAILABLE', message: tr('lib.unreadableResults') };
    }
    return { status: 'READY', results };
  } catch (err) {
    if (err instanceof Error && /session/i.test(err.message)) {
      return { status: 'UNAVAILABLE', message: err.message };
    }
    return { status: 'UNAVAILABLE', message: "Can't reach Zoey. Check your connection and try again." };
  }
}

/**
 * The dispute state as one plain line.
 *
 * A draft is never called sent, and nothing is called deleted -- the engine reports no deletion
 * outcome, so the app has nothing to claim one from.
 */
export function disputeStatusLabel(state: MobileDisputeState): string {
  switch (state.status) {
    case 'SIGNED':
      return tr('dispute.signedForApproval');
    case 'READY_TO_SIGN':
      return tr('dispute.readyToSign');
    case 'BLOCKED':
      return tr('dispute.needsAttention');
    default:
      return tr('dispute.noneReady');
  }
}
