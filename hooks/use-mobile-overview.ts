import { useCallback, useEffect, useRef, useState } from 'react';

import { getMobileOverview, type MobileOverview, type OverviewResult } from '@/lib/mobile-api';
import { useAuth } from '@/lib/auth-context';

/**
 * The signed-in client's real overview, and which of the five states the screen is in.
 *
 * LOADING → NOT_LINKED | LINKED | AUTH_ERROR | UNAVAILABLE
 *
 * `NOT_LINKED` is deliberately not an error. Every new Zoey account is in it until a specialist
 * connects them, so the screen it drives is an invitation rather than a failure.
 *
 * `refresh()` exists so the linking screen can re-ask immediately after redeeming a code: the
 * account becomes linked server-side, and the app should reflect that without a sign-out.
 */
export type OverviewState = { status: 'LOADING' } | OverviewResult;

export function useMobileOverview() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [state, setState] = useState<OverviewState>({ status: 'LOADING' });

  // Guards against a slow response for a previous user landing after an account switch, which
  // would show one person's overview to another.
  const requestFor = useRef<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!userId) {
      requestFor.current = null;
      setState({ state: 'AUTH_ERROR', message: 'Please sign in.' });
      return;
    }
    requestFor.current = userId;
    setState({ status: 'LOADING' });

    const result = await getMobileOverview();
    if (!mounted.current || requestFor.current !== userId) return;
    setState(result);
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const overview: MobileOverview | null = 'state' in state && state.state === 'LINKED' ? state.overview : null;

  return { state, overview, refresh: load };
}
