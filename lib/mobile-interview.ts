import { requireEngineBaseUrl } from '@/lib/api-config';
import { tr } from './i18n/runtime';
import { authenticatedFetch } from '@/lib/auth-fetch';

/**
 * The identity review, as the engine owns it.
 *
 * ==============================  THE APP HOLDS NO STEP MACHINE  ==============================
 *
 * Every question, every option value, every pending id and the whole notion of "what happens next"
 * come from `/api/mobile/interview`. This module transports them and does not interpret them: it
 * cannot invent a question, cannot decide an item is resolved, and cannot advance a session. The
 * screen renders `view` and posts an action; the engine answers with the next `view`. That is the
 * entire contract, and it is the `mobile-confirmation` / `consent-flow` doctrine applied again.
 *
 * ==============================  IDS ARE THE SERVER'S  ==============================
 *
 * `questionId`, `selectionId` and `summaryId` are opaque, issued by the engine in the view we are
 * currently rendering, and spent on use. The app never generates one, never reuses one across a
 * refetch, and never sends a client id, an owner id or an item id the engine did not just hand it.
 * A stale id comes back as STALE_REQUEST, which is the engine's idempotency working, not an error
 * to paper over.
 */

export const INTERVIEW_VIEW_VERSION = 'mobile-interview-v1' as const;

export type InterviewSessionState =
  | 'UNAVAILABLE'
  | 'NOT_STARTED'
  | 'OPEN'
  | 'AWAITING_CONFIRMATION'
  | 'SPECIALIST_REVIEW'
  | 'COMPLETED';

export type InterviewItemStatus =
  | 'UNREVIEWED'
  | 'AI_PROPOSED'
  | 'CONSUMER_CONFIRMED'
  | 'FINAL_RECOGNIZED'
  | 'FINAL_ORDINARY_DISPUTE'
  | 'FINAL_NOT_RECOGNIZED'
  | 'ESCALATED_SPECIALIST';

/** The engine's neutral proposal vocabulary. There is deliberately no fraud or theft value here. */
export type InterviewClassification =
  | 'RECOGNIZED_NO_ISSUE'
  | 'ORDINARY_INACCURACY_CANDIDATE'
  | 'NOT_RECOGNIZED_CANDIDATE'
  | 'NEEDS_CLARIFICATION'
  | 'SPECIALIST_REVIEW';

export type InterviewItem = {
  itemKey: string;
  label: string;
  kind: 'TRADELINE' | 'COLLECTION' | 'INQUIRY';
  bureaus: string[];
  status: InterviewItemStatus;
  classificationKey: InterviewClassification | null;
  /** The engine's own sentence, used when this build has no key for the classification. */
  explanation: string | null;
};

export type InterviewQuestion = {
  questionId: string;
  text: string;
  kind: 'YES_NO_UNSURE' | 'FREE_TEXT' | 'CHOICE';
  itemKey: string | null;
  options: { value: string; labelKey: string; label: string }[];
};

export type InterviewSelection = {
  selectionId: string;
  prompt: string;
  itemKeys: string[];
};

export type InterviewSummary = {
  summaryId: string;
  text: string;
  itemLines: {
    itemKey: string;
    label: string;
    classificationKey: InterviewClassification;
    line: string;
  }[];
};

export type InterviewEvidenceNeed = {
  slot: string;
  requirement: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  reasonKey: string;
  reason: string;
};

export type InterviewView = {
  version: typeof INTERVIEW_VIEW_VERSION;
  state: InterviewSessionState;
  sessionId: string | null;
  items: InterviewItem[];
  /** At most one of the three is non-null. The engine enforces one ask at a time. */
  pendingQuestion: InterviewQuestion | null;
  pendingSelection: InterviewSelection | null;
  pendingSummary: InterviewSummary | null;
  assistantText: string | null;
  evidenceNeeds: InterviewEvidenceNeed[];
  locale: 'en' | 'es';
};

export type InterviewState =
  | { status: 'LOADING' }
  | { status: 'READY'; view: InterviewView }
  /**
   * Not reachable, the session expired, or the engine could not answer. Never rendered as
   * "nothing to review" -- an unknown is not an all-clear.
   */
  | { status: 'UNAVAILABLE'; message: string; sessionExpired: boolean };

/** Every action the app may post. Mirrors the engine's discriminated union exactly. */
export type InterviewAction =
  | { action: 'START'; locale?: string }
  | { action: 'MESSAGE'; text: string; locale?: string }
  | { action: 'ANSWER'; questionId: string; value: string }
  | { action: 'SELECT_ITEMS'; selectionId: string; itemKeys: string[] }
  | { action: 'CONFIRM_SUMMARY'; summaryId: string; decision: 'YES' | 'CHANGE' | 'NOT_SURE' }
  | { action: 'CANCEL' };

/** The engine's closed refusal vocabulary. Anything outside it is treated as unknown, not ignored. */
export type InterviewReasonCode =
  | 'UNAVAILABLE'
  | 'NOT_FOUND'
  | 'STALE_REQUEST'
  | 'UNKNOWN_QUESTION'
  | 'MESSAGE_TOO_LONG'
  | 'RATE_LIMITED'
  | 'SESSION_STATE'
  | 'EXECUTION_FAILED';

export type InterviewSubmitResult =
  | { ok: true; view: InterviewView }
  | { ok: false; message: string; reasonCode: InterviewReasonCode | null; sessionExpired: boolean };

/**
 * Reason codes that mean the view the person is looking at no longer matches the server. The
 * caller refetches on these rather than leaving a dead form on screen -- the same reconciliation
 * `inquiry-questionnaire` performs after a failed submit.
 */
const STALE_REASONS: InterviewReasonCode[] = ['STALE_REQUEST', 'SESSION_STATE', 'NOT_FOUND', 'UNKNOWN_QUESTION'];

export function needsRefetch(result: InterviewSubmitResult): boolean {
  return !result.ok && result.reasonCode !== null && STALE_REASONS.includes(result.reasonCode);
}

function isSessionError(err: unknown): err is Error {
  return err instanceof Error && /session/i.test(err.message);
}

/** Rejects a payload this build cannot read, rather than rendering a partially understood screen. */
function readView(payload: unknown): InterviewView | null {
  const body = payload as { ok?: boolean; view?: InterviewView } | null;
  const view = body?.view;
  if (!view || view.version !== INTERVIEW_VIEW_VERSION) return null;
  return view;
}

export async function getInterview(): Promise<InterviewState> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return {
      status: 'UNAVAILABLE',
      message: err instanceof Error ? err.message : tr('lib.notConfigured'),
      sessionExpired: false,
    };
  }

  try {
    const res = await authenticatedFetch(`${baseUrl}/api/mobile/interview`);
    if (!res.ok) {
      return { status: 'UNAVAILABLE', message: tr('interview.errorLoad'), sessionExpired: false };
    }
    const view = readView(await res.json());
    if (!view) {
      return { status: 'UNAVAILABLE', message: tr('interview.errorUnreadable'), sessionExpired: false };
    }
    return { status: 'READY', view };
  } catch (err) {
    if (isSessionError(err)) {
      return { status: 'UNAVAILABLE', message: err.message, sessionExpired: true };
    }
    return { status: 'UNAVAILABLE', message: tr('interview.errorUnreachable'), sessionExpired: false };
  }
}

export async function submitInterview(action: InterviewAction): Promise<InterviewSubmitResult> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : tr('lib.notConfigured'),
      reasonCode: null,
      sessionExpired: false,
    };
  }

  try {
    const res = await authenticatedFetch(`${baseUrl}/api/mobile/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      view?: InterviewView;
      reasonCode?: InterviewReasonCode;
      error?: string;
    };

    if (!res.ok || payload.ok !== true) {
      return {
        ok: false,
        // The engine's own sentence first: it distinguishes a stale form from a refused action.
        message: payload.error ?? tr('interview.errorSubmit'),
        reasonCode: payload.reasonCode ?? null,
        sessionExpired: false,
      };
    }

    const view = readView(payload);
    if (!view) {
      return { ok: false, message: tr('interview.errorUnreadable'), reasonCode: null, sessionExpired: false };
    }
    return { ok: true, view };
  } catch (err) {
    if (isSessionError(err)) {
      return { ok: false, message: err.message, reasonCode: null, sessionExpired: true };
    }
    return { ok: false, message: tr('interview.errorUnreachable'), reasonCode: null, sessionExpired: false };
  }
}
