import { DEFAULT_LOCALE, isLocale, normalizeLocale, type Locale } from './types';

/**
 * Deciding which language to show, and remembering the answer.
 *
 * ==============================  PRECEDENCE  ==============================
 *
 * A locale chosen by the consumer always beats the device. That is the whole point of the setting:
 * somebody with an English phone who asked Zoey for Spanish must get Spanish on every device they
 * sign in on, and must not have it silently reverted by a phone they happened to open the app on.
 *
 *   1. the consumer's saved server preference (authoritative, follows them across devices)
 *   2. the locally cached choice (survives an offline start and a slow profile fetch)
 *   3. the device's preferred language
 *   4. English
 *
 * ==============================  ISOLATION  ==============================
 *
 * The local cache is keyed by account. One consumer's language must never appear in another
 * consumer's session on a shared device, and an unkeyed cache is exactly how that happens.
 */

export type LocaleSource = 'server' | 'cache' | 'device' | 'default';

export interface LocaleResolution {
  locale: Locale;
  source: LocaleSource;
}

export interface ResolveInput {
  /** From the authenticated profile. `undefined` means not loaded or not yet chosen. */
  serverLocale?: unknown;
  /** From on-device storage for this account. */
  cachedLocale?: unknown;
  /** Device preference, e.g. `es-MX`. */
  deviceLocale?: unknown;
}

export function resolveLocale({ serverLocale, cachedLocale, deviceLocale }: ResolveInput): LocaleResolution {
  if (isLocale(serverLocale)) return { locale: serverLocale, source: 'server' };
  if (isLocale(cachedLocale)) return { locale: cachedLocale, source: 'cache' };

  if (typeof deviceLocale === 'string' && deviceLocale.trim()) {
    const normalized = normalizeLocale(deviceLocale);
    /*
     * `normalizeLocale` answers English for anything unsupported, so an unsupported device language
     * is reported as `default` rather than `device`. The distinction matters to the tests: "a French
     * phone gets English" and "an English phone gets English" are different guarantees.
     */
    const primary = deviceLocale.trim().toLowerCase().split(/[-_]/)[0];
    if (isLocale(primary)) return { locale: normalized, source: 'device' };
  }

  return { locale: DEFAULT_LOCALE, source: 'default' };
}

/** Per-account storage key. The account id is opaque and never a name or an email. */
export function localeCacheKey(accountId: string | null | undefined): string {
  return accountId ? `zoey.locale.${accountId}` : 'zoey.locale.anonymous';
}

/**
 * Whether a locally cached choice should be written up to the server.
 *
 * True only when the consumer has a cached choice and the server has none — the case where somebody
 * picked a language before signing in, or while offline. It never overwrites an existing server
 * value, because the server value may have been set from another device more recently.
 */
export function shouldSyncToServer(cached: unknown, server: unknown): boolean {
  return isLocale(cached) && !isLocale(server);
}
