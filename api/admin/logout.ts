import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { secureCookies } from '../_lib/owner.js';
import {
  clearedOwnerSessionCookie,
  destroyOwnerSession,
  originIsTrusted,
  readSessionCookie,
} from '../_lib/owner-session.js';

/**
 * Owner sign-out, and a real one.
 *
 * The session record is DELETED from the shared store, so the cookie stops working immediately for
 * every instance -- not merely cleared from this browser while the credential it carried stays
 * valid. That is the difference between logging out and hiding the key.
 *
 * POST only, and same-origin only, so a link on another site cannot sign the owner out.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  const method = (req.method ?? 'GET').toUpperCase();
  if (method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  if (!originIsTrusted({ origin: first(headers.origin), host: first(headers.host), method })) {
    res.status(403).json({ error: 'Request blocked.' });
    return;
  }

  await destroyOwnerSession(readSessionCookie(first(headers.cookie)));

  res.setHeader('Set-Cookie', clearedOwnerSessionCookie(secureCookies()));
  res.setHeader('Location', '/api/admin/login');
  res.status(303).send?.('');
}
