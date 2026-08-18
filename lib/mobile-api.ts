import { requireApiBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';
import { buildLinkRequestBody, looksLikeLinkCode, mapOverviewResponse } from '@/lib/mobile-api-state';

/**
 * THE REAL ENGINE, FROM THE APP.
 *
 * ==========================  WHY THIS IS NOT `account-api.ts`  ==========================
 *
 * That module's `request()` throws a plain `Error` on any non-2xx, which collapses every failure
 * into one string. This surface needs the opposite: a 403 saying "you are signed in but not
 * connected to a client file yet" is a NORMAL state with its own screen, not an error to show in
 * red. So these return a discriminated result and never throw for an expected outcome.
 *
 * ==========================  WHAT THE APP IS ALLOWED TO SEND  ==========================
 *
 * The Supabase access token, and -- when redeeming -- a one-time code. Nothing else.
 *
 * There is deliberately no parameter anywhere in this module for a client id, an owner id, a
 * subject or an email. The server decides which credit file the caller may see from the token's
 * verified signature and from a row an owner wrote; a value sent from here could only ever be
 * ignored, so none is offered. That is enforced by the shape of these functions, not by a comment.
 */

export type MobileOverview = {
  version: 'mobile-overview-v1';
  client: { greetingName: string; memberSince: string | null };
  intake: {
    complete: boolean;
    statusLine: string;
    checklist: { slot: string; label: string; status: 'MISSING' | 'RECEIVED' | 'ACCEPTED' | 'REPLACE_REQUESTED' }[];
    missingCount: number;
  };
  documents: {
    id: string;
    name: string;
    documentType: string;
    status: 'PENDING_REVIEW' | 'ACCEPTED' | 'REPLACE_REQUESTED' | 'REJECTED';
    reason: string | null;
    uploadedAt: string;
    sizeBytes: number;
  }[];
  report: {
    received: boolean;
    accepted: boolean;
    sourceFormat: 'PDF' | 'IDENTITYIQ_HTML' | null;
    receivedAt: string | null;
  };
  analysis: { exists: boolean; state: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'NEEDS_ATTENTION'; completedAt: string | null };
  disputes: { round: number; state: 'NONE' | 'PREPARING' | 'AWAITING_YOUR_SIGNATURE' | 'SENT' | 'RESPONSE_RECEIVED'; actionRequired: boolean };
  mail: { state: 'NOT_STARTED' | 'PREPARING' | 'AWAITING_TRACKING_RECORD' | 'TRACKING_AVAILABLE'; lastEventAt: string | null } | null;
  limits: { maxUploadBytes: number };
};

/**
 * The five states this screen can be in. `NOT_LINKED` is a first-class state, not an error --
 * every new Zoey account is in it until a specialist connects them.
 */
export type OverviewResult =
  | { state: 'LINKED'; overview: MobileOverview }
  | { state: 'NOT_LINKED' }
  | { state: 'AUTH_ERROR'; message: string }
  | { state: 'UNAVAILABLE'; message: string };

async function readError(res: Response): Promise<{ error?: string; reasonCode?: string }> {
  try {
    return (await res.json()) as { error?: string; reasonCode?: string };
  } catch {
    return {};
  }
}

/**
 * Loads the signed-in client's real overview from the engine.
 *
 * Sends only the bearer token. `authenticatedFetch` attaches the current Supabase access token and
 * throws its own error when there is no session, which is reported as an auth problem rather than
 * a network one -- reporting "can't reach Zoey" for an expired session is what made the original
 * failure undiagnosable from the screen.
 */
export async function getMobileOverview(): Promise<OverviewResult> {
  let baseUrl: string;
  try {
    baseUrl = requireApiBaseUrl();
  } catch (err) {
    return { state: 'UNAVAILABLE', message: err instanceof Error ? err.message : 'Zoey is not configured.' };
  }

  let res: Response;
  try {
    res = await authenticatedFetch(`${baseUrl}/api/mobile/overview`);
  } catch (err) {
    if (err instanceof Error && /session/i.test(err.message)) {
      return { state: 'AUTH_ERROR', message: err.message };
    }
    return { state: 'UNAVAILABLE', message: "Can't reach Zoey. Check your connection and try again." };
  }

  if (res.ok) {
    try {
      return { state: 'LINKED', overview: (await res.json()) as MobileOverview };
    } catch {
      return { state: 'UNAVAILABLE', message: 'Zoey sent something this app could not read.' };
    }
  }

  // The status -> state decision lives in the pure module so it can be executed and asserted.
  const mapped = mapOverviewResponse(res.status, await readError(res));
  if (mapped.state === 'LINKED') {
    // Unreachable for a non-2xx, but the type must stay total.
    return { state: 'UNAVAILABLE', message: 'Zoey sent an unexpected response.' };
  }
  return mapped;
}

export type LinkResult =
  | { ok: true }
  | { ok: false; reasonCode: string; message: string };

/**
 * Redeems a one-time code from a specialist.
 *
 * The ONLY body field is the code. Which client it connects to is carried by the code itself,
 * server-side; which person is connecting comes from the token's verified subject. Neither is
 * something this app could assert even if it tried.
 */
export async function linkMobileAccount(linkToken: string): Promise<LinkResult> {
  let baseUrl: string;
  try {
    baseUrl = requireApiBaseUrl();
  } catch (err) {
    return { ok: false, reasonCode: 'NOT_CONFIGURED', message: err instanceof Error ? err.message : 'Zoey is not configured.' };
  }

  let res: Response;
  try {
    res = await authenticatedFetch(`${baseUrl}/api/mobile/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // One field, built by the pure helper so the guarantee is testable.
      body: JSON.stringify(buildLinkRequestBody(linkToken)),
    });
  } catch (err) {
    if (err instanceof Error && /session/i.test(err.message)) {
      return { ok: false, reasonCode: 'AUTH', message: err.message };
    }
    return { ok: false, reasonCode: 'NETWORK', message: "Can't reach Zoey. Check your connection and try again." };
  }

  if (res.ok) return { ok: true };

  const body = await readError(res);
  return {
    ok: false,
    reasonCode: body.reasonCode ?? `HTTP_${res.status}`,
    message: body.error ?? 'That code could not be used.',
  };
}

export { looksLikeLinkCode };
