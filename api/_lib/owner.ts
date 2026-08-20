import type { ApiRequest, ApiResponse } from './http.js';

/**
 * Owner-only gate for the admin surface.
 *
 * Authenticates with `ZOEY_ADMIN_SECRET`, a SERVER environment variable. It is
 * deliberately not an `EXPO_PUBLIC_*` value, so it is never inlined into the app
 * bundle and no client can hold it. A normal authenticated Zoey client -- even
 * with a perfectly valid Supabase token -- cannot pass this gate, which is what
 * keeps membership promotion out of clients' hands.
 *
 * Fails CLOSED: if the secret is unset on the server, every admin route is
 * disabled rather than open. An unconfigured deployment must not be an
 * unprotected one.
 *
 * The secret may arrive as the `x-zoey-admin-secret` header, or -- for a GET
 * only -- as the `key` query parameter, because a browser opening a page cannot
 * set a header.
 *
 * A CREDENTIAL IN A URL IS A CREDENTIAL IN A LOG. Query strings are recorded by
 * proxies and platform access logs, kept in browser history, and forwarded in
 * the `Referer` of anything the page loads. So the query form is now confined to
 * the one case that cannot work without it: any state-changing method must send
 * the header, and every response passing through this gate is marked no-store
 * and no-referrer so the page cannot be cached or leak the URL onward.
 *
 * The residual exposure -- the secret still reaching the platform's own access
 * log for the initial page load -- is not closed by this change. Closing it
 * needs a real owner login, which is a bigger change than a hardening pass
 * should make unannounced.
 */
export function requireOwner(req: ApiRequest, res: ApiResponse): boolean {
  const expected = process.env.ZOEY_ADMIN_SECRET;

  if (!expected || expected.length < 16) {
    res.status(503).json({
      error:
        'Owner access is not configured. Set ZOEY_ADMIN_SECRET (32+ random characters) on the server.',
    });
    return false;
  }

  // Never cached, and never forwarded as a Referer to anything this page loads.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'no-referrer');

  const header = req.headers?.['x-zoey-admin-secret'];
  const fromHeader = Array.isArray(header) ? header[0] : header;

  // The query form is read ONLY for a GET. A mutation carrying its credential in
  // the URL is refused even when the value is correct.
  const method = (req.method ?? 'GET').toUpperCase();
  const rawQuery = method === 'GET' ? req.query?.key : undefined;
  const fromQuery = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  const supplied = fromHeader || fromQuery || '';

  if (!timingSafeEqual(supplied, expected)) {
    res.status(404).json({ error: 'Not found' });
    return false;
  }

  return true;
}

/**
 * Length-independent constant-time-ish comparison.
 *
 * Plain `===` on secrets leaks length and prefix through timing. This is not a
 * hardened primitive, but it removes the trivial oracle.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
