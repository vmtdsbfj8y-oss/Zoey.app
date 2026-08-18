import { requireEngineBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';

/**
 * Consumer consent, as the app sees it.
 *
 * ==========================  THE ENGINE DECIDES THE STEP  ==========================
 *
 * There is no local step machine here. `GET /api/mobile/onboarding` returns which step is
 * outstanding and the exact document for it, and this module renders whatever it is told. A local
 * copy of the sequence would be a second opinion about what somebody has consented to, and the one
 * that drifts is always the copy.
 *
 * ==========================  THE DOCUMENT IS NOT OURS  ==========================
 *
 * `expectedHash` goes back exactly as it arrived. It is the consumer's statement of what they
 * read; the server re-derives the current text and compares. Nothing here caches a body and
 * re-uses it later, because the canonical document lives on the server and can change.
 */

export type OnboardingStep =
  | 'NEEDS_LEGAL_NAME'
  | 'NEEDS_FEDERAL_DISCLOSURE'
  | 'NEEDS_MA_STATEMENT'
  | 'NEEDS_SIGNATURE'
  | 'COMPLETE'
  | 'UNAVAILABLE';

export type OnboardingDocument = {
  version: string;
  title: string;
  body: string;
  expectedHash: string;
  cancellationCostNote?: string;
  cancellationFormsBody?: string;
  electronicConsentBody?: string;
};

/** The retained copy. Only fields the server chose to expose -- no internal ids. */
export type SignedCopy = {
  version: string;
  signedAt: string;
  signatureName: string;
  body: string;
  cancellationCostNote: string;
  cancellationFormsBody: string;
  documentHash: string;
  legalName: string;
  principalBusinessAddress: string;
  organizationSignerName: string;
  organizationSignerTitle: string;
  signerChannel: string;
};

export type OnboardingState = {
  step: OnboardingStep;
  legalName: string;
  legalNameIsPlaceholder: boolean;
  document: OnboardingDocument | null;
  message: string;
  signedCopy: SignedCopy | null;
};

export type ConsentResult =
  | { ok: true; reasonCode?: string; message?: string }
  /** The server refused. `message` is safe to show as-is. */
  | { ok: false; reasonCode: string; message: string };

const UNREACHABLE = "Can't reach Zoey. Check your connection and try again.";

async function engine(path: string, init?: RequestInit): Promise<Response> {
  return authenticatedFetch(`${requireEngineBaseUrl()}${path}`, init);
}

/**
 * The current step. Returns null when it cannot be read -- the caller shows nothing rather than
 * guessing that consent is complete.
 */
export async function getOnboardingState(): Promise<OnboardingState | null> {
  try {
    const res = await engine('/api/mobile/onboarding');
    if (!res.ok) return null;
    const body = (await res.json()) as OnboardingState & { ok?: boolean };
    return body.step ? body : null;
  } catch {
    return null;
  }
}

async function post(body: Record<string, unknown>): Promise<ConsentResult> {
  let res: Response;
  try {
    res = await engine('/api/mobile/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && /session/i.test(err.message)) {
      return { ok: false, reasonCode: 'AUTH', message: err.message };
    }
    return { ok: false, reasonCode: 'NETWORK', message: UNREACHABLE };
  }

  const parsed = (await res.json().catch(() => ({}))) as Partial<ConsentResult> & { message?: string; reasonCode?: string };
  if (res.ok && parsed.ok) return { ok: true, reasonCode: parsed.reasonCode, message: parsed.message };
  return {
    ok: false,
    reasonCode: parsed.reasonCode ?? `HTTP_${res.status}`,
    message: parsed.message ?? 'That could not be completed.',
  };
}

export async function saveLegalName(fullName: string): Promise<ConsentResult> {
  return post({ action: 'set_name', fullName });
}

/** Electronic consent is passed as given -- never defaulted to true on the way out. */
export async function acknowledgeFederal(input: { expectedHash: string; signatureName: string; electronicConsent: boolean }): Promise<ConsentResult> {
  return post({ action: 'acknowledge_federal', ...input });
}

export async function acknowledgeMassachusetts(input: { expectedHash: string; signatureName: string }): Promise<ConsentResult> {
  return post({ action: 'acknowledge_ma', ...input });
}

export async function signAcknowledgment(input: { expectedHash: string; signatureName: string }): Promise<ConsentResult> {
  return post({ action: 'sign', ...input });
}

/** True when the server says the copy on screen is stale and must be read again. */
export function needsRefresh(result: ConsentResult): boolean {
  return !result.ok && result.reasonCode === 'REFRESH_REQUIRED';
}
