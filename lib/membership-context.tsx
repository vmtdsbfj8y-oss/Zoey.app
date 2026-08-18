import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { FREE_MEMBERSHIP, getMembership, type Membership, type MembershipStatus } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';

/**
 * The app-level source of truth for Zoey membership.
 *
 * The value here is a CACHE of a server decision, never the decision itself.
 * Nothing in the app can write it: there is no setter on the context, and the
 * only server function that can grant `active` lives in `api/_lib/membership.ts`
 * with no HTTP route pointing at it.
 *
 * Fails closed everywhere -- signed out, still loading, request failed, server
 * too old to report membership: all resolve to `free`. A bug must never hand
 * out paid access.
 */

type MembershipValue = {
  status: MembershipStatus;
  /** Sugar for `status === 'active'`. */
  isPremium: boolean;
  /** True until the first server answer for the current user has landed. */
  loading: boolean;
  /** Set when the last refresh failed. Status stays `free` in that case. */
  error?: string;
  membership: Membership;
  /** Re-reads from the server. Call after a payment completes. */
  refresh: () => Promise<void>;
};

const MembershipContext = createContext<MembershipValue | null>(null);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;

  const [membership, setMembership] = useState<Membership>(FREE_MEMBERSHIP);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  // Guards against a slow response for a previous user landing after a switch,
  // which would show one account's entitlement to another.
  const requestFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      requestFor.current = null;
      setMembership(FREE_MEMBERSHIP);
      setError(undefined);
      setLoading(false);
      return;
    }

    requestFor.current = userId;
    setLoading(true);
    setError(undefined);

    try {
      const next = await getMembership();
      if (requestFor.current !== userId) return;
      setMembership(next);
    } catch (err) {
      if (requestFor.current !== userId) return;
      // Deliberately still free -- an unreachable server is not an entitlement.
      setMembership(FREE_MEMBERSHIP);
      setError(err instanceof Error ? err.message : 'Could not check your membership.');
    } finally {
      if (requestFor.current === userId) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Wait for auth to settle so the first read carries a real token.
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const value = useMemo<MembershipValue>(
    () => ({
      status: membership.status,
      isPremium: membership.status === 'active',
      loading,
      error,
      membership,
      refresh: load,
    }),
    [membership, loading, error, load]
  );

  return <MembershipContext.Provider value={value}>{children}</MembershipContext.Provider>;
}

export function useMembership() {
  const value = useContext(MembershipContext);
  if (!value) throw new Error('useMembership must be used inside MembershipProvider');
  return value;
}
