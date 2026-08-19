import { requireEngineBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';

/**
 * The prepared dispute packet, and the client's signature on it.
 *
 * The packet hash is fetched and sent straight back, untouched. It is what binds a signature to an
 * exact set of letters: if the packet changed after this screen opened, the engine refuses the
 * signature as stale rather than letting it inherit material the client never saw. Nothing here
 * builds, renders or edits a letter -- the app shows the titles the engine prepared and hashed.
 */

export type DisputeLetter = { title: string };

export type DisputeReview = {
  version: 'mobile-dispute-review-v1';
  /** The engine's own vocabulary: NONE | BLOCKED | READY_TO_SIGN | SIGNED. */
  status: string;
  round: number;
  packetHash: string | null;
  preparedAt: string | null;
  letters: DisputeLetter[];
  blockingIssues: string[];
  attestationText: string | null;
  signature: { required: boolean; signedAt: string | null; typedName: string | null };
};

export type DisputeReviewState =
  | { status: 'LOADING' }
  | { status: 'READY'; review: DisputeReview }
  | { status: 'UNAVAILABLE'; message: string };

export async function getDisputeReview(): Promise<DisputeReviewState> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return { status: 'UNAVAILABLE', message: err instanceof Error ? err.message : 'Zoey is not configured.' };
  }

  try {
    const res = await authenticatedFetch(`${baseUrl}/api/mobile/disputes/signature`);
    if (!res.ok) return { status: 'UNAVAILABLE', message: "Zoey couldn't load your disputes right now." };
    const review = (await res.json()) as DisputeReview;
    if (review.version !== 'mobile-dispute-review-v1') {
      return { status: 'UNAVAILABLE', message: 'Zoey sent a packet this app could not read.' };
    }
    return { status: 'READY', review };
  } catch (err) {
    if (err instanceof Error && /session/i.test(err.message)) return { status: 'UNAVAILABLE', message: err.message };
    return { status: 'UNAVAILABLE', message: "Can't reach Zoey. Check your connection and try again." };
  }
}

export type SignResult =
  | { ok: true; signedAt: string | null; message: string }
  | { ok: false; message: string };

export async function signDisputePacket(input: {
  packetHash: string;
  typedName: string;
  attestationAccepted: boolean;
  electronicSignatureConsent: boolean;
}): Promise<SignResult> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Zoey is not configured.' };
  }

  try {
    const res = await authenticatedFetch(`${baseUrl}/api/mobile/disputes/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      signedAt?: string | null;
      message?: string;
      error?: string;
    };
    if (!res.ok || body.ok !== true) {
      // The server distinguishes a stale packet from a missing name from an open questionnaire.
      return { ok: false, message: body.error ?? "Zoey couldn't record your signature. Please try again." };
    }
    return {
      ok: true,
      signedAt: body.signedAt ?? null,
      message: body.message ?? 'Your dispute round has been submitted to Pinnacle for final review.',
    };
  } catch {
    return { ok: false, message: "Can't reach Zoey. Check your connection and try again." };
  }
}
