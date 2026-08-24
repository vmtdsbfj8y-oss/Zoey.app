/**
 * The localisation contract.
 *
 * ==============================  WHY A HAND-BUILT LAYER  ==============================
 *
 * No i18n dependency was added. Everything this app needs -- interpolation, plurals, dates, numbers,
 * percentages, currency -- is either three lines of code or already in the platform as `Intl`, which
 * React Native ships with Hermes. A runtime i18n library would add a bundle, a lifecycle and a second
 * source of truth about the active locale for no capability this file does not already provide.
 *
 * The one dependency added is `expo-localization`, which reads the device's preferred language. That
 * cannot be done without a native module, and it is Expo's own.
 *
 * ==============================  WHY FLAT SEMANTIC KEYS  ==============================
 *
 * Keys are flat, dot-separated and semantic (`settings.language.title`), never English sentences.
 * English-as-key is the mistake that makes a copy edit silently orphan a translation: change the
 * English, and every other language falls back without anybody noticing. A semantic key survives
 * rewording, and the parity test can compare two flat objects by key rather than walking a tree.
 */

/** The supported set. Deliberately closed -- a locale is validated against this before it is stored. */
export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Native names, shown in the picker in the language they name. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Narrows anything -- a device tag, a stored profile field, a request header -- to a supported locale.
 *
 * Accepts region-tagged tags (`es-MX`, `es-419`, `en-GB`) by taking the primary subtag, because that
 * is what a device actually reports. Anything unsupported becomes English rather than throwing: a
 * consumer with a Portuguese phone should get a working app, not a crash.
 */
export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== 'string') return DEFAULT_LOCALE;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(primary) ? primary : DEFAULT_LOCALE;
}

/** The shape both resource files must satisfy. Values are strings; plurals are declared explicitly. */
export type Plural = { one: string; other: string };
export type Message = string | Plural;
export type Resource = Record<string, Message>;

export function isPlural(message: Message): message is Plural {
  return typeof message === 'object' && message !== null && 'other' in message;
}
