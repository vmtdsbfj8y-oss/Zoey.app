import type { BureauScore, Scores } from '@/lib/account-api';
import { requireEngineBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';
import { buildLinkRequestBody, looksLikeLinkCode, mapOverviewResponse } from '@/lib/mobile-api-state';

/**
 * THE REAL ENGINE, FROM THE APP.
 *
 * ==========================  WHICH BACKEND  ==========================
 *
 * Every request here goes to `requireEngineBaseUrl()` -- EXPO_PUBLIC_ZOEY_ENGINE_URL -- and never
 * to Zoey's own app API. The two are different servers: the engine holds the real credit file and
 * implements `/api/mobile/*`; the app API holds subscription, profile and goals and does not.
 * Sending one's routes to the other returns 404, which callers cannot distinguish from "you have
 * no account", so the base is chosen per module rather than per call.
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
    checklist: {
      slot: string;
      label: string;
      status: 'MISSING' | 'RECEIVED' | 'ACCEPTED' | 'REPLACE_REQUESTED';
      /** The engine's own requirement flag. Supporting evidence is optional and never blocks. */
      required: boolean;
    }[];
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
  /**
   * Bureau scores the engine read from the client's newest scored report.
   *
   * A bureau with no score is ABSENT from this array -- never a zero and never a placeholder. The
   * UI renders absence as "Not available".
   */
  scores: {
    bureau: string;
    score: number;
    model: string | null;
    extractedAt: string;
    /** When the report the score came from was received. Absent on an older engine. */
    reportReceivedAt?: string | null;
  }[];
  /**
   * Recovery affordances the engine says are currently available.
   *
   * `canConnectExistingFile` is true only when this sign-in sits on a blank auto-provisioned file
   * with nothing in it. The app neither computes nor requests this -- showing the option is the
   * engine's decision, made by the same audit that would authorise the move, so a visible screen is
   * always a screen whose action will be permitted.
   *
   * Optional because an older engine deployment will not send it, and absent must read as "no".
   */
  account?: { canConnectExistingFile: boolean };
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
    baseUrl = requireEngineBaseUrl();
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
    baseUrl = requireEngineBaseUrl();
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

/* -------------------------------------------------------------------------- *
 * Scores
 * -------------------------------------------------------------------------- */

/** Display names for the engine's canonical lowercase bureau ids. */
const BUREAU_LABEL: Record<string, string> = {
  transunion: 'TransUnion',
  experian: 'Experian',
  equifax: 'Equifax',
};

/**
 * The real bureau scores, from the engine.
 *
 * Returns the same shape the score screens already consume, so nothing downstream had to be
 * restructured -- only the source changed, from Zoey's own API (which nothing writes scores to any
 * more) to the engine that actually reads the report.
 *
 * `history` is deliberately empty. The engine stores scores per report, so a trend would need two
 * scored reports and a decision about how to line them up; an empty history draws no chart, which
 * is the honest rendering of "we have one reading".
 *
 * An EMPTY `latest` is a normal answer -- a report that prints no score produces none -- and the
 * UI must render that as "Not available" rather than substituting anything.
 */
export async function getEngineScores(): Promise<Scores> {
  const result = await getMobileOverview();
  if (result.state !== 'LINKED') {
    return { latest: [], history: [], extractionAvailable: false };
  }

  return {
    extractionAvailable: true,
    history: [],
    latest: result.overview.scores.map((row) => ({
      // Stable per bureau within one reading; not a database id.
      scoreId: `${row.bureau}-${row.extractedAt}`,
      bureau: (BUREAU_LABEL[row.bureau] ?? row.bureau) as BureauScore['bureau'],
      score: row.score,
      model: row.model ?? undefined,
      capturedAt: Date.parse(row.extractedAt),
      reportReceivedAt: row.reportReceivedAt ? Date.parse(row.reportReceivedAt) : undefined,
    })),
  };
}
