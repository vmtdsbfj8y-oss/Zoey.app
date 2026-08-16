import type { ApiRequest, ApiResponse } from './http.js';

export type AuthUser = { id: string; email?: string };

export async function requireUser(req: ApiRequest, res: ApiResponse): Promise<AuthUser | null> {
  const header = req.headers?.authorization;
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Sign in required.' }); return null; }
  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) { res.status(503).json({ error: 'Authentication is not configured on the server.' }); return null; }
  try {
    const authRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    if (!authRes.ok) { res.status(401).json({ error: 'Your session expired. Sign in again.' }); return null; }
    const user = (await authRes.json()) as AuthUser;
    if (!user.id) { res.status(401).json({ error: 'Invalid session.' }); return null; }
    return user;
  } catch { res.status(503).json({ error: 'Could not verify your secure session.' }); return null; }
}
