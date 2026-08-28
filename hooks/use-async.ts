import { useCallback, useEffect, useRef, useState } from 'react';

import { tr } from '@/lib/i18n/runtime';
import { DEFAULT_REQUEST_TIMEOUT_MS, withTimeout } from '@/lib/with-timeout';

/**
 * Loading / data / error state for a fetch, with retry.
 *
 * Every More screen needs the same four states, and hand-rolling them per
 * screen is how one of them ends up rendering a blank view on failure.
 *
 * ==============================  THE WAIT IS BOUNDED  ==============================
 *
 * `try/catch` already covered a request that FAILS. It did nothing for one that never answers,
 * and `fetch` carries no timeout of its own -- an unreachable host stalls rather than erroring.
 * That is how Settings came to sit on "Loading your settings…" with no error and no retry.
 *
 * Every screen using this hook now gets a deadline, so "we could not reach it" always becomes a
 * visible, retryable error instead of a spinner nobody can leave.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  options: { timeoutMs?: number } = {}
) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  // Guards against setting state after unmount, and against a slow first
  // request landing on top of a newer one after a retry.
  const mounted = useRef(true);
  const runId = useRef(0);

  const run = useCallback(async () => {
    const id = ++runId.current;
    setLoading(true);
    setError(undefined);

    try {
      const result = await withTimeout(fn(), timeoutMs, tr('error.timeout'));
      if (!mounted.current || id !== runId.current) return;
      setData(result);
    } catch (err) {
      if (!mounted.current || id !== runId.current) return;
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      if (mounted.current && id === runId.current) setLoading(false);
    }
    // `fn` is intentionally not a dependency -- callers pass an inline closure,
    // which would be a new reference every render and loop forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => {
      mounted.current = false;
    };
  }, [run]);

  /** Replace local data without a refetch, after a successful mutation. */
  const setLocal = useCallback((next: T) => setData(next), []);

  return { data, error, loading, retry: run, setLocal };
}
