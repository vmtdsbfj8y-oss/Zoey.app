import { useCallback, useEffect, useState } from 'react';

import { getMobileResults, type ResultsState } from '@/lib/mobile-results';

/**
 * The engine's results, re-read on mount.
 *
 * Nothing is persisted, so a relaunch fetches again and the screen always shows what the engine
 * holds now rather than what it held when the app was last open.
 */
export function useMobileResults() {
  const [state, setState] = useState<ResultsState>({ status: 'LOADING' });

  const refresh = useCallback(async () => {
    setState(await getMobileResults());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { state, refresh };
}
