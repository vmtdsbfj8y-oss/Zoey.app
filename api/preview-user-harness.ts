import type { ApiRequest, ApiResponse } from './_lib/http.js';

/**
 * TEMPORARY, PREVIEW ONLY. DELETE AFTER USE.
 *
 * Mints a confirmed disposable Supabase account and returns an ordinary consumer
 * session for it, so the post-deletion resurrection guard can be proven against
 * a real token rather than a fixture. The service-role key never leaves the
 * server; what comes back is exactly what a signed-in app would hold.
 *
 * Constant-time secret, flat 404 outside Preview.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (process.env.VERCEL_ENV !== 'preview') return void res.status(404).json({ error: 'Not found' });
  const expected = process.env.PREVIEW_USER_HARNESS_SECRET ?? '';
  if (expected.length < 24) return void res.status(404).json({ error: 'Not found' });
  const header = req.headers?.['x-preview-user-secret'];
  const supplied = Array.isArray(header) ? header[0] : header;
  if (!timingSafeEqual(supplied ?? '', expected)) return void res.status(404).json({ error: 'Not found' });

  const url = (process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !anon || !service) return void res.status(503).json({ error: 'Supabase not fully configured' });

  const qv = (name: string) => {
    const value = req.query?.[name];
    return (Array.isArray(value) ? value[0] : value) ?? '';
  };

  if (qv('action') === 'user-exists') {
    const userId = qv('userId');
    if (!userId) return void res.status(400).json({ error: 'userId required' });
    const found = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
    return void res.status(200).json({ exists: found.status === 200, status: found.status });
  }

  const tag = qv('tag') || 'x';
  const email = `zoey-preview-legacy-${tag}-${Date.now()}@mailinator.com`;
  const password = `Prv-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}!A9`;

  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) return void res.status(502).json({ error: 'create failed', status: created.status });
  const user = (await created.json()) as { id?: string };

  const signedIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!signedIn.ok) return void res.status(502).json({ error: 'sign-in failed', status: signedIn.status });
  const session = (await signedIn.json()) as { access_token?: string };

  res.status(200).json({ userId: user.id, accessToken: session.access_token });
}
