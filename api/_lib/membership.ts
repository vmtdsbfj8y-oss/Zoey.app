import { storeFor, type StoredMembership } from './store.js';

/**
 * Zoey membership: the server-side source of truth.
 *
 * ## Why there is no write endpoint
 *
 * The only functions that can move a user to `active` are exported from this
 * module, and this module is imported ONLY by server code. There is no HTTP
 * route anywhere in `api/` that writes a membership record, so "mark myself
 * active" is not an operation the API exposes -- a client cannot call it,
 * forge a body for it, or replay it. When the payment provider is wired up,
 * its webhook handler imports `grantMembership` directly after verifying the
 * provider's own signature.
 *
 * Reads are scoped by `storeFor(userId)`, where `userId` comes from
 * `requireUser()` -- a Supabase token verified against `/auth/v1/user`. A
 * client therefore cannot read anyone else's status: the key namespace is
 * derived from the verified token, never from a request parameter.
 */

export type MembershipStatus = 'free' | 'active';

export type MembershipView = {
  status: MembershipStatus;
  /** 'Free Member' | 'Zoey Member' -- one place, so labels cannot drift. */
  label: string;
  /** epoch ms when active access ends, when the grant is time-bounded. */
  activeUntil: number | null;
  /** epoch ms of the first grant. */
  startedAt: number | null;
  /** Billing provider. null until real billing is connected. */
  provider: string | null;
  /** What granted it. null while the user has never been granted membership. */
  source: string | null;
};

export const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  free: 'Free Member',
  active: 'Zoey Member',
};

/**
 * The published Zoey Membership price. Single source -- every screen reads it,
 * so the number cannot drift between the paywall, the CTAs and the API.
 * `weeklyEquivalent` is marketing copy only; billing is monthly.
 */
export const MEMBERSHIP_PRICE = {
  amount: 49.99,
  currency: 'USD',
  interval: 'month',
  weeklyEquivalent: 'Less than $12/week',
} as const;

export const FREE_MEMBERSHIP: MembershipView = {
  status: 'free',
  label: MEMBERSHIP_LABEL.free,
  activeUntil: null,
  startedAt: null,
  provider: null,
  source: null,
};

/**
 * Resolves a stored record to an effective status.
 *
 * Everything unknown resolves to `free`: no record, a malformed record, or an
 * `active` grant whose `activeUntil` has passed. Failing closed is the only
 * safe direction -- a bug must never hand out paid access.
 */
export function resolveMembership(record: StoredMembership | null): MembershipView {
  const base = {
    activeUntil: record?.activeUntil ?? null,
    startedAt: record?.startedAt ?? null,
    provider: record?.provider ?? null,
    source: record?.source ?? null,
  };

  if (!record || record.status !== 'active') {
    return { ...FREE_MEMBERSHIP, ...base, status: 'free', label: MEMBERSHIP_LABEL.free };
  }

  const expired = typeof record.activeUntil === 'number' && record.activeUntil <= Date.now();
  if (expired) return { ...base, status: 'free', label: MEMBERSHIP_LABEL.free };

  return { ...base, status: 'active', label: MEMBERSHIP_LABEL.active };
}

/** Effective membership for a verified Supabase user id. */
export async function getMembershipFor(userId: string): Promise<MembershipView> {
  try {
    return resolveMembership(await storeFor(userId).getMembership());
  } catch {
    // A store outage must not grant access.
    return FREE_MEMBERSHIP;
  }
}

/* -------------------------------------------------------------------------- *
 * SERVER-ONLY WRITES
 *
 * Never import these from a route that a client can reach without first
 * verifying the payment provider's signature.
 * -------------------------------------------------------------------------- */

/** Marks a user active. Called by a verified payment webhook, never by the app. */
export async function grantMembership(
  userId: string,
  options: { source: string; activeUntil?: number | null; provider?: string | null }
): Promise<MembershipView> {
  const store = storeFor(userId);
  const previous = await store.getMembership();
  const record: StoredMembership = {
    status: 'active',
    activeUntil: options.activeUntil ?? null,
    source: options.source,
    // Preserved across renewals so the owner can see when they first joined.
    startedAt: previous?.startedAt ?? Date.now(),
    provider: options.provider ?? null,
    updatedAt: Date.now(),
  };
  await store.putMembership(record);
  return resolveMembership(record);
}

/** Returns a user to free -- cancellation, refund, or chargeback. */
export async function revokeMembership(userId: string, source: string): Promise<MembershipView> {
  const previous = await storeFor(userId).getMembership();
  const record: StoredMembership = {
    status: 'free',
    activeUntil: null,
    source,
    startedAt: previous?.startedAt ?? null,
    provider: previous?.provider ?? null,
    updatedAt: Date.now(),
  };
  await storeFor(userId).putMembership(record);
  return resolveMembership(record);
}
