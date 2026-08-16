import { supabase } from '@/lib/supabase';

/** Adds the current Supabase access token to every private Zoey API request. */
export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session expired. Sign in again.');
  return fetch(input, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}
