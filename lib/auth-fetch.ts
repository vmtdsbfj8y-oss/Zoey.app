import { supabase } from '@/lib/supabase';
import { tr } from './i18n/runtime';

/**
 * Adds the current Supabase access token to every private Zoey API request.
 *
 * ==============================  THE DEADLINE IS OPT-IN  ==============================
 *
 * `fetch` has no timeout of its own and an unreachable host stalls rather than failing, so a caller
 * that awaits this without a deadline can wait forever. The deadline is opt-in rather than global
 * because the callers are not alike: reading a view is a small request that should give up quickly,
 * while an upload legitimately streams megabytes over a slow connection and must not be cut off by
 * a timer meant for a JSON GET.
 *
 * When a deadline is given the request is ABORTED, not merely abandoned. Racing a timer would leave
 * the socket open and the response still on its way; aborting releases it and lets the caller's own
 * catch see a failure it can report.
 *
 * A caller that supplies its own `signal` keeps it -- its cancellation is more specific than ours.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: { timeoutMs?: number } = {}
) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error(tr('lib.sessionExpired'));

  const headers = { ...init.headers, Authorization: `Bearer ${token}` };

  const { timeoutMs } = options;
  if (!timeoutMs || timeoutMs <= 0 || init.signal) {
    return fetch(input, { ...init, headers });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
