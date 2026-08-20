import { createHash, randomBytes, timingSafeEqual as nodeTimingSafeEqual } from 'crypto';

import { sharedStoreCommand } from './store.js';

/**
 * A REAL OWNER SESSION, NOT A SECRET IN A URL.
 *
 * ==============================  WHAT THIS REPLACES  ==============================
 *
 * `ZOEY_ADMIN_SECRET` was the session. It was accepted as a header OR as `?key=` in the address bar,
 * which meant the owner's long-lived credential travelled in a URL: recorded in the platform's
 * access log, kept in browser history, and forwarded in the `Referer` of anything the page loaded.
 * There was no login, no expiry, no logout and no way to revoke anything, because there was nothing
 * to revoke -- possession of one static string was permanent access.
 *
 * ==============================  WHAT IT IS NOW  ==============================
 *
 * The secret is a LOGIN CREDENTIAL, submitted once in a POST body and never again. What authorises
 * subsequent requests is an opaque 256-bit session id in an HttpOnly cookie, whose SHA-256 is the
 * key of a record in the shared store with a server-enforced expiry.
 *
 * The id is stored HASHED for the same reason a password is: the session store is the thing an
 * attacker who reaches the database can read, and a hash there cannot be replayed as a cookie.
 *
 * Because the record is server-side, logout is real -- deleting it ends the session immediately
 * rather than hoping a self-describing token expires.
 */

/** Eight hours. Long enough for a working day, short enough that a forgotten tab is not forever. */
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export const OWNER_COOKIE_NAME = 'zoey_owner_session';

const sessionKey = (id: string) => `zoey:owner-session:${createHash('sha256').update(id, 'utf8').digest('hex')}`;

/** Length-independent comparison, so a wrong password leaks neither its length nor its prefix. */
export function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) {
    // Still do the work, so the mismatch is not measurably faster than a wrong-but-same-length one.
    nodeTimingSafeEqual(left, left);
    return false;
  }
  return nodeTimingSafeEqual(left, right);
}

/** The configured owner password. Absent or short means owner access is disabled, never open. */
export function ownerCredentialConfigured(): boolean {
  return (process.env.ZOEY_ADMIN_SECRET ?? '').length >= 16;
}

export function ownerCredentialMatches(supplied: string): boolean {
  const expected = process.env.ZOEY_ADMIN_SECRET ?? '';
  if (expected.length < 16) return false;
  return timingSafeEqual(supplied, expected);
}

/**
 * Mints a session and records it server-side.
 *
 * A fresh id every login, so a session identifier can never be reused across logins -- the rotation
 * that stops a previously-observed cookie from being revived by logging in again.
 */
export async function createOwnerSession(): Promise<string | null> {
  const id = randomBytes(32).toString('base64url');
  const stored = await sharedStoreCommand([
    'SET',
    sessionKey(id),
    JSON.stringify({ createdAt: Date.now() }),
    'EX',
    SESSION_TTL_SECONDS,
  ]).catch(() => null);

  // No store, no session. An owner who cannot be logged out is not logged in.
  return stored === null ? null : id;
}

export async function ownerSessionIsValid(id: string | null | undefined): Promise<boolean> {
  if (!id || id.length < 32 || id.length > 128) return false;
  // Opaque and random: anything outside the alphabet we mint cannot be one of ours.
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return false;

  const found = await sharedStoreCommand(['GET', sessionKey(id)]).catch(() => null);
  return typeof found === 'string' && found.length > 0;
}

/** Real revocation: the record is gone, so the cookie stops working immediately. */
export async function destroyOwnerSession(id: string | null | undefined): Promise<void> {
  if (!id) return;
  await sharedStoreCommand(['DEL', sessionKey(id)]).catch(() => undefined);
}

/**
 * The Set-Cookie for a new session.
 *
 * HttpOnly so no script can read it. Secure so it never travels in clear. SameSite=Strict because
 * this portal is opened directly and never linked into from elsewhere, which makes it the strongest
 * available setting and the first layer of the CSRF answer. Path-scoped to the admin surface so it
 * is not attached to unrelated requests.
 */
export function ownerSessionCookie(id: string, secure: boolean): string {
  const attributes = [
    `${OWNER_COOKIE_NAME}=${id}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api/admin',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

/** The Set-Cookie that removes it. Same attributes, so the browser matches and replaces it. */
export function clearedOwnerSessionCookie(secure: boolean): string {
  const attributes = [`${OWNER_COOKIE_NAME}=`, 'HttpOnly', 'SameSite=Strict', 'Path=/api/admin', 'Max-Age=0'];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function readSessionCookie(header: string | undefined): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === OWNER_COOKIE_NAME) return rest.join('=') || null;
  }
  return null;
}

/**
 * Is this request one the browser made deliberately, or one another site made on the owner's behalf?
 *
 * SameSite=Strict already stops the cookie riding along on a cross-site request in every browser
 * that honours it. This is the second layer, for state-changing methods only: an Origin that is not
 * ours is refused outright, and a missing Origin is refused too, because a same-origin fetch always
 * sends one and a request without it is not something the portal produced.
 */
export function originIsTrusted(input: { origin?: string; host?: string; method: string }): boolean {
  if (input.method === 'GET' || input.method === 'HEAD') return true;
  if (!input.origin || !input.host) return false;
  try {
    return new URL(input.origin).host === input.host;
  } catch {
    return false;
  }
}
