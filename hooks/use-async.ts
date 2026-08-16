import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loading / data / error state for a fetch, with retry.
 *
 * Every More screen needs the same four states, and hand-rolling them per
 * screen is how one of them ends up rendering a blank view on failure.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
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
      const result = await fn();
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
