import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { en } from './en';
import { es } from './es';
import * as fmt from './format';
import { localeCacheKey, resolveLocale, shouldSyncToServer, type LocaleSource } from './preference';
import { createTranslator, setMissingHandler, type Translator } from './translate';
import { DEFAULT_LOCALE, isLocale, type Locale, type Resource } from './types';

/**
 * The live locale for the running app.
 *
 * Switching language re-renders through context rather than reloading. Nothing about the session,
 * profile, documents, goals or notification preferences is touched -- changing a display language
 * must never cost somebody their place in the app, and a restart-to-apply would also mean a
 * restart-to-discover-you-picked-wrong.
 */

const TABLES: Record<Locale, Resource> = { en, es };

/** Mirrors the SecureStore/web split already used for the Supabase session. */
const store = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key).catch(() => null);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value).catch(() => undefined);
  },
};

export interface I18nValue {
  locale: Locale;
  source: LocaleSource;
  /** Translate. `t('settings.title')`, `t('documents.itemsReceived', { count: 3 })`. */
  t: Translator;
  setLocale: (next: Locale) => void;
  formatDate: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: Date | number) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrencyCents: (cents: number, currency?: string) => string;
  formatPercent: (value: number, fractionDigits?: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Device preference, read once. No permission is required and none is requested. */
function deviceLocale(): string | undefined {
  try {
    return Localization.getLocales()[0]?.languageTag;
  } catch {
    return undefined;
  }
}

export function I18nProvider({
  children,
  accountId,
  serverLocale,
  onPersist,
}: {
  children: React.ReactNode;
  /** Opaque account id, used only to key the on-device cache. Null when signed out. */
  accountId?: string | null;
  /** From the authenticated profile, once loaded. */
  serverLocale?: unknown;
  /** Writes the choice to the profile. Failure is non-fatal; the local cache still holds. */
  onPersist?: (locale: Locale) => Promise<void> | void;
}) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [source, setSource] = useState<LocaleSource>('default');
  const [cached, setCached] = useState<unknown>(undefined);
  /* Set once the consumer picks a language in this session; stops later resolution overriding them. */
  const chosenHere = useRef(false);

  const cacheKey = localeCacheKey(accountId);

  /* Load the cached choice for THIS account. Re-runs on account change so a sign-out clears it. */
  useEffect(() => {
    let alive = true;
    chosenHere.current = false;
    store.get(cacheKey).then((value) => {
      if (alive) setCached(value ?? undefined);
    });
    return () => {
      alive = false;
    };
  }, [cacheKey]);

  /* Resolve from precedence whenever an input changes, unless the consumer chose in this session. */
  useEffect(() => {
    if (chosenHere.current) return;
    const resolved = resolveLocale({ serverLocale, cachedLocale: cached, deviceLocale: deviceLocale() });
    setLocaleState(resolved.locale);
    setSource(resolved.source);
  }, [serverLocale, cached]);

  /* A choice made before sign-in, or offline, is pushed up once a server value is known to be absent. */
  useEffect(() => {
    if (!onPersist) return;
    if (shouldSyncToServer(cached, serverLocale) && isLocale(cached)) {
      void Promise.resolve(onPersist(cached)).catch(() => undefined);
    }
  }, [cached, serverLocale, onPersist]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      chosenHere.current = true;
      setLocaleState(next);
      setSource('cache');
      void store.set(cacheKey, next);
      if (onPersist) void Promise.resolve(onPersist(next)).catch(() => undefined);
    },
    [cacheKey, onPersist]
  );

  const value = useMemo<I18nValue>(() => {
    const t = createTranslator(locale, TABLES[locale] ?? en, en);
    return {
      locale,
      source,
      t,
      setLocale,
      formatDate: (v, o) => fmt.formatDate(v, locale, o),
      formatTime: (v, o) => fmt.formatTime(v, locale, o),
      formatDateTime: (v) => fmt.formatDateTime(v, locale),
      formatNumber: (v, o) => fmt.formatNumber(v, locale, o),
      formatCurrencyCents: (c, cur) => fmt.formatCurrencyCents(c, locale, cur),
      formatPercent: (v, d) => fmt.formatPercent(v, locale, d),
    };
  }, [locale, source, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Falls back to a working English translator rather than throwing when no provider is mounted.
 *
 * A missing provider must not be able to blank a screen. It shows English and the dev handler
 * reports nothing unusual, which is the correct failure for a display concern.
 */
const FALLBACK: I18nValue = {
  locale: DEFAULT_LOCALE,
  source: 'default',
  t: createTranslator(DEFAULT_LOCALE, en, en),
  setLocale: () => undefined,
  formatDate: (v, o) => fmt.formatDate(v, DEFAULT_LOCALE, o),
  formatTime: (v, o) => fmt.formatTime(v, DEFAULT_LOCALE, o),
  formatDateTime: (v) => fmt.formatDateTime(v, DEFAULT_LOCALE),
  formatNumber: (v, o) => fmt.formatNumber(v, DEFAULT_LOCALE, o),
  formatCurrencyCents: (c, cur) => fmt.formatCurrencyCents(c, DEFAULT_LOCALE, cur),
  formatPercent: (v, d) => fmt.formatPercent(v, DEFAULT_LOCALE, d),
};

export function useI18n(): I18nValue {
  return useContext(I18nContext) ?? FALLBACK;
}

/** Shorthand for the common case. */
export function useT(): Translator {
  return useI18n().t;
}

/* Gaps are loud in development and in tests, silent for consumers. */
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  setMissingHandler(({ key, locale, reason }) => {
    // eslint-disable-next-line no-console
    console.warn(`[i18n] ${reason}: "${key}" (${locale})`);
  });
}
