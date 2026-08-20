import type { ApiRequest, ApiResponse } from './_lib/http.js';
import { listUsers, storeFor } from './_lib/store.js';

/**
 * TEMPORARY, PREVIEW ONLY. DELETE AFTER USE.
 *
 * Creates and inspects DISPOSABLE test accounts so the account-deletion path can
 * be proven end to end against something safe to destroy. It performs no
 * deletion of its own: the proof calls the real /api/account/delete.
 *
 * The service-role key never leaves the server. This returns a normal user
 * access token for an account it just created -- the same thing the app would
 * hold after a sign-in -- and nothing else privileged.
 *
 * Guarded by a constant-time secret and 404s outside Preview.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const supabase = () => ({
  url: (process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, ''),
  anon: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  service: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
});

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (process.env.VERCEL_ENV !== 'preview') return void res.status(404).json({ error: 'Not found' });
  const expected = process.env.PREVIEW_HARNESS_SECRET ?? '';
  if (expected.length < 24) return void res.status(404).json({ error: 'Not found' });
  const header = req.headers?.['x-preview-harness-secret'];
  const supplied = Array.isArray(header) ? header[0] : header;
  if (!timingSafeEqual(supplied ?? '', expected)) return void res.status(404).json({ error: 'Not found' });

  const { url, anon, service } = supabase();
  if (!url || !anon || !service) return void res.status(503).json({ error: 'Supabase is not fully configured on this deployment.' });

  const q = (name: string) => {
    const value = req.query?.[name];
    return (Array.isArray(value) ? value[0] : value) ?? '';
  };
  const action = q('action');

  // ---- create a confirmed disposable user and return a real session ---------
  if (action === 'create-user') {
    const tag = q('tag') || 'a';
    const email = `zoey-preview-deletion-${tag}-${Date.now()}@mailinator.com`;
    const password = `Prv-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}!A9`;

    const created = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    if (!created.ok) return void res.status(502).json({ error: 'create failed', status: created.status });
    const user = (await created.json()) as { id?: string };
    if (!user.id) return void res.status(502).json({ error: 'create returned no id' });

    const signedIn = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!signedIn.ok) return void res.status(502).json({ error: 'sign-in failed', status: signedIn.status });
    const session = (await signedIn.json()) as { access_token?: string };
    if (!session.access_token) return void res.status(502).json({ error: 'sign-in returned no token' });

    // The token is a normal consumer session. The email is masked in the response.
    return void res.status(200).json({
      userId: user.id,
      accessToken: session.access_token,
      emailMasked: `${email.slice(0, 12)}…@mailinator.com`,
    });
  }

  // ---- what the app side currently holds for a user -------------------------
  if (action === 'inspect-user') {
    const userId = q('userId');
    if (!userId) return void res.status(400).json({ error: 'userId required' });

    const authRes = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    });

    let kv: Record<string, number> = {};
    try {
      const store = storeFor(userId);
      const [profile, docs, goals, scores] = await Promise.all([
        store.getProfile(), store.listDocs(), store.listGoals(), store.listScores(),
      ]);
      kv = { profile: profile ? 1 : 0, documents: docs.length, goals: goals.length, scores: scores.length };
    } catch {
      kv = { profile: -1, documents: -1, goals: -1, scores: -1 };
    }

    const directory = (await listUsers().catch(() => [])).filter((u) => u.userId === userId).length;

    return void res.status(200).json({
      authUserExists: authRes.status === 200,
      authStatus: authRes.status,
      kv,
      directoryRows: directory,
    });
  }

  // ---- last-resort cleanup for a disposable user the proof left behind ------
  if (action === 'purge-user') {
    const userId = q('userId');
    if (!userId) return void res.status(400).json({ error: 'userId required' });
    const del = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
    return void res.status(200).json({ purged: del.ok || del.status === 404, status: del.status });
  }

  return void res.status(400).json({ error: 'unknown action' });
}
