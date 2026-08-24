import { DEFAULT_LOCALE, type Locale } from './types';

/**
 * Locale-aware formatting, built on `Intl`.
 *
 * The BCP-47 tags matter. Spanish here is `es-US` rather than `es-ES`: a consumer reading their US
 * credit report in Spanish still expects US dollars, US date order and the US thousands separator.
 * `es-ES` would render 1.234,56 and dd/mm/yyyy, which is correct Spanish and wrong for this product.
 */
const TAGS: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-US',
};

export function localeTag(locale: Locale): string {
  return TAGS[locale] ?? TAGS[DEFAULT_LOCALE];
}

/**
 * Every formatter is wrapped, because `Intl` throws on a malformed value and a date that cannot be
 * formatted must not take a screen down. On failure the caller gets an empty string and the
 * surrounding copy still renders.
 */
function guard<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function formatDate(
  value: Date | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
): string {
  return guard(() => new Intl.DateTimeFormat(localeTag(locale), options).format(value), '');
}

export function formatTime(
  value: Date | number,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
): string {
  return guard(() => new Intl.DateTimeFormat(localeTag(locale), options).format(value), '');
}

export function formatDateTime(value: Date | number, locale: Locale): string {
  return guard(
    () =>
      new Intl.DateTimeFormat(localeTag(locale), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(value),
    ''
  );
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return guard(() => new Intl.NumberFormat(localeTag(locale), options).format(value), '');
}

/**
 * Currency. Cents in, formatted string out.
 *
 * Takes minor units because that is how the membership price is stored, and converting at the call
 * site is where rounding errors get introduced.
 */
export function formatCurrencyCents(cents: number, locale: Locale, currency = 'USD'): string {
  return guard(
    () =>
      new Intl.NumberFormat(localeTag(locale), {
        style: 'currency',
        currency,
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(cents / 100),
    ''
  );
}

/** Takes a percentage as written (32 means 32%), not a 0-1 fraction. */
export function formatPercent(value: number, locale: Locale, fractionDigits = 0): string {
  return guard(
    () =>
      new Intl.NumberFormat(localeTag(locale), {
        style: 'percent',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value / 100),
    ''
  );
}

/** Which plural form applies. Delegates to CLDR data rather than guessing at `n === 1`. */
export function pluralCategory(count: number, locale: Locale): Intl.LDMLPluralRule {
  return guard(() => new Intl.PluralRules(localeTag(locale)).select(count), count === 1 ? 'one' : 'other');
}
