import { supabase } from '@/lib/supabase';
import { tr } from './i18n/runtime';

/** Adds the current Supabase access token to every private Zoey API request. */
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error(tr('lib.sessionExpired'));
  return fetch(input, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}
