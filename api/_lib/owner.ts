import type { ApiRequest, ApiResponse } from './http.js';
import {
  originIsTrusted,
  ownerSessionIsValid,
  readSessionCookie,
  timingSafeEqual,
} from './owner-session.js';

/**
 * Owner-only gate for the admin surface.
 *
 * ==============================  WHAT CHANGED, AND WHY  ==============================
 *
 * This used to accept `ZOEY_ADMIN_SECRET` as a header OR as `?key=` in the address bar, and that
 * was the whole of owner authentication. A long-lived credential in a URL is a credential in the
 * platform's access log, in browser history, and in the `Referer` of anything the page loads -- and
 * there was no login, no expiry, no logout and nothing to revoke, because possession of one static
 * string was permanent access.
 *
 * A HUMAN now authenticates with a session cookie minted by /api/admin/login and revocable by
 * /api/admin/logout. The query parameter is gone entirely; there is no code path left that reads a
 * credential from a URL.
 *
 * ==============================  THE MACHINE EXCEPTION  ==============================
 *
 * The credit engine calls /api/admin/clients server-to-server to read and set membership. That is a
 * genuine machine caller with no browser, no cookie jar and nowhere to log in, so it keeps the
 * header -- and ONLY the header, on the one route that needs it. `requireOwnerSession` has no
 * machine path at all, which is what keeps the portal page human-only.
 *
 * Fails CLOSED in both: an unset secret disables the machine path, and an unreachable session store
 * denies the human one.
 */

function secureCookies(): boolean {
  // Set by the platform in every deployed environment and by nothing else, so local http still works.
  return Boolean(process.env.VERCEL);
}

function noStore(res: ApiResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

/**
 * A signed-in human owner. Cookie only.
 *
 * State-changing methods additionally require a same-origin request: SameSite=Strict already stops
 * the cookie riding along cross-site, and this refuses anything whose Origin is absent or foreign,
 * so "the route is POST" is not doing the work.
 */
export async function requireOwnerSession(req: ApiRequest, res: ApiResponse): Promise<boolean> {
  noStore(res);

  const method = (req.method ?? 'GET').toUpperCase();
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  if (!originIsTrusted({ origin: first(headers.origin), host: first(headers.host), method })) {
    res.status(403).json({ error: 'Request blocked.' });
    return false;
  }

  const session = readSessionCookie(first(headers.cookie));
  if (!(await ownerSessionIsValid(session))) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return false;
  }

  return true;
}

/**
 * The engine calling as itself. Header only, never a cookie, never a URL.
 *
 * Deliberately separate from `requireOwnerSession` so neither can silently become the other: a
 * machine key cannot open the portal page, and a browser session cannot impersonate the engine.
 */
export function requireMachineOwner(req: ApiRequest, res: ApiResponse): boolean {
  noStore(res);

  const expected = process.env.ZOEY_ADMIN_SECRET;
  if (!expected || expected.length < 16) {
    res.status(503).json({ error: 'Owner access is not configured.' });
    return false;
  }

  const header = (req.headers ?? {})['x-zoey-admin-secret'];
  const supplied = Array.isArray(header) ? header[0] : header;
  if (!supplied || !timingSafeEqual(supplied, expected)) {
    res.status(404).json({ error: 'Not found' });
    return false;
  }

  return true;
}

/** Either a signed-in human or the engine. For the one route that genuinely serves both. */
export async function requireOwnerSessionOrMachine(req: ApiRequest, res: ApiResponse): Promise<boolean> {
  const header = (req.headers ?? {})['x-zoey-admin-secret'];
  if (header) return requireMachineOwner(req, res);
  return requireOwnerSession(req, res);
}

export { secureCookies };
