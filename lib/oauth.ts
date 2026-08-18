import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

/**
 * Apple / Google sign-in through the EXISTING Supabase auth system.
 *
 * There is no separate account store: this completes into the same
 * `supabase.auth` session the email/password flow produces, so `AuthProvider`,
 * the `Stack.Protected` guards and Sign Out all behave identically regardless
 * of how the user signed in.
 *
 * Implemented with the OAuth browser flow because `expo-web-browser` and
 * `expo-linking` are already dependencies. Native Sign in with Apple would need
 * `expo-apple-authentication` AND a paid Apple Developer account, neither of
 * which exists here yet -- see `PROVIDER_SETUP` below.
 *
 * Nothing here fabricates a session. If a provider is not configured in the
 * Supabase dashboard, Supabase returns an error and it is shown to the user
 * verbatim.
 */

export type OAuthProvider = 'apple' | 'google';

/** What still has to be done outside this codebase, per provider. */
export const PROVIDER_SETUP: Record<OAuthProvider, string[]> = {
  apple: [
    'Paid Apple Developer Program membership',
    'An App ID with "Sign in with Apple" enabled, plus a Services ID',
    'A Sign in with Apple key (.p8) and its Key ID + Team ID',
    'Apple enabled in Supabase → Authentication → Providers, with those values',
    `Redirect URL allow-listed in Supabase: ${'zoeyapp://sign-in'}`,
  ],
  google: [
    'A Google Cloud OAuth 2.0 Client ID + secret (Web application type)',
    'Google enabled in Supabase → Authentication → Providers, with those values',
    'Supabase callback URL added to the Google client\'s Authorized redirect URIs',
    `Redirect URL allow-listed in Supabase: ${'zoeyapp://sign-in'}`,
  ],
};

/**
 * Opens the provider's sign-in page and completes the Supabase session.
 *
 * @returns true when a session was established, false when the user cancelled.
 * @throws  with the provider's real error when it is not configured or fails.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<boolean> {
  // Resolves to zoeyapp://sign-in in a build, or the exp:// host in Expo Go.
  const redirectTo = Linking.createURL('/sign-in');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // We drive the browser ourselves so the result can be read back here.
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error(`Zoey could not start ${provider} sign-in.`);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  // dismiss/cancel are ordinary outcomes, not errors -- the user backed out.
  if (result.type !== 'success') return false;

  return completeFromRedirect(result.url);
}

/**
 * Turns the redirect URL into a session.
 *
 * Supabase returns either an implicit-grant fragment (`#access_token=...`) or a
 * PKCE `?code=...`, depending on project settings, so both are handled.
 */
async function completeFromRedirect(url: string): Promise<boolean> {
  const fragment = url.includes('#') ? url.slice(url.indexOf('#') + 1) : '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const params = new URLSearchParams(fragment || query);

  const errorDescription = params.get('error_description') ?? params.get('error');
  if (errorDescription) throw new Error(decodeURIComponent(errorDescription));

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return true;
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  throw new Error('Sign-in finished without returning a session. Please try again.');
}
