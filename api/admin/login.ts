import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { readBody } from '../_lib/http.js';
import { secureCookies } from '../_lib/owner.js';
import {
  createOwnerSession,
  ownerCredentialConfigured,
  ownerCredentialMatches,
  ownerSessionCookie,
} from '../_lib/owner-session.js';
import { sharedStoreCommand } from '../_lib/store.js';

/**
 * Owner sign-in.
 *
 * ==============================  WHY THIS EXISTS  ==============================
 *
 * There was no login. `ZOEY_ADMIN_SECRET` in a query string WAS the session, so the owner's
 * long-lived credential travelled in the address bar and into the platform's access log every time
 * the portal was opened. The password is now submitted once, in a POST body, and what authorises
 * everything afterwards is a session that can expire and be revoked.
 *
 * The form posts to itself. There is no GET path that accepts a credential, which is what makes the
 * old leak structurally impossible rather than merely discouraged.
 */

/** Ten attempts per fifteen minutes, counted in the shared store so instances cannot be spread across. */
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

async function tooManyAttempts(address: string): Promise<boolean> {
  const window = Math.floor(Date.now() / (ATTEMPT_WINDOW_SECONDS * 1000));
  const key = `zoey:owner-login:${window}:${address}`;
  const count = await sharedStoreCommand(['INCR', key]).catch(() => null);
  if (count === null) return true; // Cannot count means cannot admit.
  await sharedStoreCommand(['EXPIRE', key, ATTEMPT_WINDOW_SECONDS]).catch(() => undefined);
  return Number(count) > ATTEMPT_LIMIT;
}

/** First hop only. Shared by everyone behind one NAT, which is why the ceiling is generous. */
function callerAddress(req: ApiRequest): string {
  const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
  const raw = headers['x-forwarded-for'];
  const forwarded = Array.isArray(raw) ? raw[0] : raw;
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

const PAGE = (message: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Zoey Owner</title>
<style>
 body{background:#0A0518;color:#EDE9F5;font:16px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;
      display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
 form{background:rgba(255,255,255,.04);border:1px solid rgba(168,85,247,.25);border-radius:20px;
      padding:28px;width:320px}
 h1{font-size:18px;margin:0 0 4px} p{color:#9C93B0;font-size:13px;margin:0 0 18px}
 input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:12px;border:1px solid rgba(168,85,247,.3);
       background:rgba(0,0,0,.25);color:#EDE9F5;font-size:15px}
 button{width:100%;margin-top:12px;padding:11px;border:0;border-radius:12px;background:#A855F7;color:#fff;
        font-size:15px;font-weight:600}
 .msg{color:#F0A6A6;font-size:13px;margin-top:12px;min-height:16px}
</style></head><body>
<form method="POST" action="/api/admin/login">
  <h1>Zoey Owner</h1>
  <p>Sign in to manage client membership.</p>
  <input type="password" name="secret" autocomplete="current-password" autofocus placeholder="Owner password" />
  <button type="submit">Sign in</button>
  <div class="msg">${message}</div>
</form></body></html>`;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Referrer-Policy', 'no-referrer');

  const method = (req.method ?? 'GET').toUpperCase();

  if (method === 'GET') {
    if (!ownerCredentialConfigured()) {
      res.status(503).send?.(PAGE('Owner access is not configured on this deployment.'));
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send?.(PAGE(''));
    return;
  }

  if (method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  /*
   * Counted BEFORE the comparison, so a refused attempt does not also get a free check, and the
   * refusal is worded exactly like a wrong password -- a throttle that announces itself is a way to
   * learn that the password you tried was worth throttling.
   */
  if (await tooManyAttempts(callerAddress(req))) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(401).send?.(PAGE('Incorrect password.'));
    return;
  }

  const body = readBody<{ secret?: string }>(req.body);
  const supplied = typeof body?.secret === 'string' ? body.secret : '';

  if (!ownerCredentialMatches(supplied)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(401).send?.(PAGE('Incorrect password.'));
    return;
  }

  const session = await createOwnerSession();
  if (!session) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(503).send?.(PAGE('Sessions are not available on this deployment.'));
    return;
  }

  // A fresh id per login: a previously observed cookie cannot be revived by signing in again.
  res.setHeader('Set-Cookie', ownerSessionCookie(session, secureCookies()));
  res.setHeader('Location', '/api/admin/portal');
  res.status(303).send?.('');
}
