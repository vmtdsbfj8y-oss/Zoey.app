import { applyCors, readBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import {
  getMembershipFor,
  grantMembership,
  revokeMembership,
  type MembershipView,
} from '../_lib/membership.js';
import { requireOwner } from '../_lib/owner.js';
import { listUsers, registerUser, storeFor } from '../_lib/store.js';

/**
 * Owner client management. Gated by `requireOwner` -- never reachable by a
 * Zoey client, whatever Supabase token they hold.
 *
 * GET  /api/admin/clients            -> { clients: [...] }
 * POST /api/admin/clients            -> { client }        (set membership)
 *        body: { userId, status: 'free' | 'active', activeUntil? }
 *
 * The POST is the trusted, owner-only mechanism for setting ACTIVE before
 * Apple StoreKit is connected. It is the ONLY write path to membership that is
 * exposed over HTTP, and it requires the server secret.
 */

export type AdminClient = {
  userId: string;
  email: string | null;
  name: string | null;
  membership: MembershipView;
  firstSeen: number;
  lastSeen: number;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).json(null);
    return;
  }
  if (!requireOwner(req, res)) return;

  if (req.method === 'POST' || req.method === 'PATCH') {
    const body = readBody<{ userId: string; status: string; activeUntil?: number | null }>(
      req.body
    );

    if (!body.userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    if (body.status !== 'free' && body.status !== 'active') {
      res.status(400).json({ error: "status must be 'free' or 'active'" });
      return;
    }

    // Make sure the client appears in the directory even if the owner set them
    // before they ever made an authenticated request.
    await registerUser(body.userId);

    const membership =
      body.status === 'active'
        ? await grantMembership(body.userId, {
            // Recorded as owner-set, NOT as a payment -- the owner portal must
            // never leave data that looks like a real Apple subscription.
            source: 'owner-admin',
            provider: null,
            activeUntil: body.activeUntil ?? null,
          })
        : await revokeMembership(body.userId, 'owner-admin');

    res.status(200).json({ client: { userId: body.userId, membership } });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
    return;
  }

  const users = await listUsers();

  const clients: AdminClient[] = await Promise.all(
    users.map(async (u) => {
      // Name comes from the client's own profile record; absent is normal.
      let name: string | null = null;
      try {
        const profile = await storeFor(u.userId).getProfile();
        const parts = [profile?.firstName, profile?.lastName].filter(Boolean);
        name = parts.length ? parts.join(' ') : null;
      } catch {
        name = null;
      }
      return {
        userId: u.userId,
        email: u.email ?? null,
        name,
        membership: await getMembershipFor(u.userId),
        firstSeen: u.firstSeen,
        lastSeen: u.lastSeen,
      };
    })
  );

  clients.sort((a, b) => b.lastSeen - a.lastSeen);

  res.status(200).json({
    clients,
    counts: {
      total: clients.length,
      zoeyMembers: clients.filter((c) => c.membership.status === 'active').length,
      freeMembers: clients.filter((c) => c.membership.status === 'free').length,
    },
  });
}
