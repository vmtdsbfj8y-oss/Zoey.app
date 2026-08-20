import type { ApiRequest, ApiResponse } from './_lib/http.js';

/** TEMPORARY, PREVIEW ONLY. DELETE AFTER USE. Mints disposable confirmed accounts for abuse tests. */
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
  if (!timingSafeEqual((Array.isArray(header) ? header[0] : header) ?? '', expected)) {
    return void res.status(404).json({ error: 'Not found' });
  }

  const url = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !anon || !service) return void res.status(503).json({ error: 'not configured' });

  const qv = (n: string) => { const v = req.query?.[n]; return (Array.isArray(v) ? v[0] : v) ?? ''; };

  if (qv('action') === 'purge') {
    const del = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(qv('userId'))}`, {
      method: 'DELETE', headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
    return void res.status(200).json({ purged: del.ok || del.status === 404 });
  }

  const email = `zoey-preview-abuse-${qv('tag') || 'x'}-${Date.now()}@mailinator.com`;
  const password = `Prv-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}!A9`;
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST', headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok) return void res.status(502).json({ error: 'create failed' });
  const user = (await created.json()) as { id?: string };
  const signedIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!signedIn.ok) return void res.status(502).json({ error: 'sign-in failed' });
  const session = (await signedIn.json()) as { access_token?: string };
  res.status(200).json({ userId: user.id, accessToken: session.access_token });
}
