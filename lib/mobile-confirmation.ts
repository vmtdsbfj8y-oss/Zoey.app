import { requireEngineBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';

/**
 * The questions Zoey is waiting on, and the client's answers.
 *
 * Every question and every answer value comes from the engine. The app chooses none of them: it
 * cannot invent an inquiry, cannot reword the prompt, and cannot add a fourth answer. What it does
 * choose is the label on each button -- plain language over YES / NO / UNSURE -- and the mapping is
 * one line, right here, so a change to the engine's vocabulary breaks visibly rather than quietly
 * sending an answer that means something else.
 */

export type ConfirmationAnswer = 'YES' | 'NO' | 'UNSURE';

export type ConfirmationQuestion = {
  id: string;
  creditor: string | null;
  inquiryDate: string | null;
  bureau: string | null;
  prompt: string;
};

export type ConfirmationView = {
  version: 'mobile-confirmation-v1';
  state: 'REQUIRED' | 'NONE';
  type: 'INQUIRY_CONFIRMATION' | null;
  requestId: string | null;
  attestationText: string | null;
  questions: ConfirmationQuestion[];
};

export type ConfirmationState =
  | { status: 'LOADING' }
  | { status: 'READY'; view: ConfirmationView }
  /** Not reachable, or the server could not answer. Never rendered as "nothing to do". */
  | { status: 'UNAVAILABLE'; message: string };

/**
 * The client's words for the engine's values.
 *
 * "I don't recognize it" says what the person recalls. It does not say the inquiry was
 * unauthorized, and it promises nothing about removal -- the engine's own recorded statement is
 * equally careful, and the button a person taps should not claim more than the record it produces.
 */
export const ANSWER_LABELS: { value: ConfirmationAnswer; label: string }[] = [
  { value: 'YES', label: 'Yes — I recognize it' },
  { value: 'NO', label: "No — I don't recognize it" },
  { value: 'UNSURE', label: "I'm not sure" },
];

export async function getConfirmation(): Promise<ConfirmationState> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return { status: 'UNAVAILABLE', message: err instanceof Error ? err.message : 'Zoey is not configured.' };
  }

  try {
    const res = await authenticatedFetch(`${baseUrl}/api/mobile/confirmations`);
    if (!res.ok) return { status: 'UNAVAILABLE', message: "Zoey couldn't load your questions right now." };
    const view = (await res.json()) as ConfirmationView;
    if (view.version !== 'mobile-confirmation-v1') {
      return { status: 'UNAVAILABLE', message: 'Zoey sent questions this app could not read.' };
    }
    return { status: 'READY', view };
  } catch (err) {
    if (err instanceof Error && /session/i.test(err.message)) return { status: 'UNAVAILABLE', message: err.message };
    return { status: 'UNAVAILABLE', message: "Can't reach Zoey. Check your connection and try again." };
  }
}

export type SubmitResult =
  | { ok: true; workflowResumed: boolean; message: string }
  | { ok: false; message: string };

export async function submitConfirmation(input: {
  requestId: string;
  answers: Record<string, ConfirmationAnswer>;
  attestationAccepted: boolean;
}): Promise<SubmitResult> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Zoey is not configured.' };
  }

  try {
    const res = await authenticatedFetch(`${baseUrl}/api/mobile/confirmations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      workflowResumed?: boolean;
      message?: string;
      error?: string;
    };
    if (!res.ok || body.ok !== true) {
      // The server's own sentence. It distinguishes a stale form from an incomplete one.
      return { ok: false, message: body.error ?? "Zoey couldn't record your answers. Please try again." };
    }
    return {
      ok: true,
      workflowResumed: body.workflowResumed === true,
      message: body.message ?? 'Thanks — Zoey is continuing your review.',
    };
  } catch {
    return { ok: false, message: "Can't reach Zoey. Check your connection and try again." };
  }
}
