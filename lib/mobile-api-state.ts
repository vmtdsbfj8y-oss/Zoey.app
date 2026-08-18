/**
 * PURE RESPONSE MAPPING FOR THE MOBILE ENGINE CLIENT.
 *
 * Deliberately import-free. The decisions worth checking here -- which HTTP status becomes which
 * app state, and what is allowed into a request body -- are pure functions of their inputs, and
 * keeping them in a module with no dependencies means they can be executed and asserted directly.
 *
 * This mirrors how `the-wizard` separates `*-button-state.ts` from the component that renders it,
 * for the same reason: the branching is the part that can be wrong.
 */

export type MobileOverviewStateName = 'LINKED' | 'NOT_LINKED' | 'AUTH_ERROR' | 'UNAVAILABLE';

export type MappedOverview =
  | { state: 'LINKED' }
  | { state: 'NOT_LINKED' }
  | { state: 'AUTH_ERROR'; message: string }
  | { state: 'UNAVAILABLE'; message: string };

/**
 * HTTP status -> app state.
 *
 * 403 is NOT an error. It means the token was perfectly good and this person simply has not been
 * connected to a client file yet, which is the state every new account starts in. Rendering it as
 * a failure is what would make a working app look broken on first launch.
 */
export function mapOverviewResponse(
  status: number,
  body: { error?: string; reasonCode?: string } = {}
): MappedOverview {
  if (status >= 200 && status < 300) return { state: 'LINKED' };
  if (status === 403) return { state: 'NOT_LINKED' };
  if (status === 401) return { state: 'AUTH_ERROR', message: body.error ?? 'Please sign in again.' };
  return {
    state: 'UNAVAILABLE',
    message: body.error ?? 'Zoey could not load your account right now. Please try again shortly.',
  };
}

/**
 * The redemption request body.
 *
 * Exactly one field, always. Written as a function so the guarantee is testable: whatever else a
 * caller happens to have in scope, the object that goes on the wire carries the code and nothing
 * else. There is no client id, owner id, subject or email to omit, because none is accepted.
 */
export function buildLinkRequestBody(linkToken: string): { linkToken: string } {
  return { linkToken: String(linkToken ?? '').trim() };
}

/** Codes are 64 hex characters. Checked locally only to avoid a pointless round trip. */
export function looksLikeLinkCode(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(String(value ?? '').replace(/\s+/g, ''));
}
