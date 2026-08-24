import { useCallback, useEffect, useState } from 'react';

import { getProfile, saveLocale } from '@/lib/account-api';
import { useAuth } from '@/lib/auth-context';
import { I18nProvider } from './context';
import { isLocale, type Locale } from './types';

/**
 * Connects the locale provider to the signed-in account.
 *
 * Kept apart from `I18nProvider` on purpose: the provider itself has no idea what an account or a
 * profile endpoint is, which is what makes it testable in a Node test with no Supabase, no network
 * and no Expo runtime. This file is the only place the two concerns meet.
 *
 * A failed profile fetch is not an error state here. The provider already resolved a locale from the
 * on-device cache or the device language, so a consumer offline at launch sees the right language and
 * the server value reconciles whenever it arrives.
 */
export function AccountI18nProvider({ children }: { children: React.ReactNode }) {
  const { session, user } = useAuth();
  const accountId = user?.id ?? null;
  const [serverLocale, setServerLocale] = useState<unknown>(undefined);

  useEffect(() => {
    let alive = true;
    /* Signed out: forget the previous account's server value so it cannot leak into this session. */
    if (!session) {
      setServerLocale(undefined);
      return () => {
        alive = false;
      };
    }
    getProfile()
      .then((profile) => {
        if (alive && isLocale(profile?.locale)) setServerLocale(profile.locale);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [session, accountId]);

  const persist = useCallback(
    async (locale: Locale) => {
      if (!session) return;
      await saveLocale(locale).catch(() => undefined);
    },
    [session]
  );

  return (
    <I18nProvider accountId={accountId} serverLocale={serverLocale} onPersist={persist}>
      {children}
    </I18nProvider>
  );
}
