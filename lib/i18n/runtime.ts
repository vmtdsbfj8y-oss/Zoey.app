import { en } from './en';
import { es } from './es';
import { createTranslator } from './translate';
import { DEFAULT_LOCALE, type Locale, type Resource } from './types';

/**
 * A translator for modules that are not React components.
 *
 * ==============================  WHY THIS EXISTS  ==============================
 *
 * Plenty of consumer-visible copy lives outside the render tree: the body of an `Alert`, the message
 * on a rejected upload, the label a status code maps to. Those live in plain `.ts` modules that
 * cannot call a hook, and threading a locale through every one of their signatures would mean
 * changing call sites all over the app to move a display concern around.
 *
 * So the active locale is mirrored here, and `I18nProvider` keeps it in step on every change.
 *
 * ==============================  WHAT THIS IS NOT  ==============================
 *
 * It is not the source of truth and components must not read it. Components use `useI18n`, which is
 * reactive; this mirror is not, and a component reading it would render stale copy after a language
 * change. It is safe for the two cases it exists for: code that runs at event time (an alert fires
 * after the switch), and pure label functions called during a render that context has already
 * re-triggered.
 */

const TABLES: Record<Locale, Resource> = { en, es };

let active: Locale = DEFAULT_LOCALE;
let translate = createTranslator(DEFAULT_LOCALE, en, en);

/** Called by the provider whenever the locale changes. Nothing else should call it. */
export function setActiveLocale(locale: Locale): void {
  active = locale;
  translate = createTranslator(locale, TABLES[locale] ?? en, en);
}

export function activeLocale(): Locale {
  return active;
}

/** Same contract as the hook's `t`, minus the reactivity. */
export function tr(key: string, options?: { count?: number; values?: Record<string, string | number> }): string {
  return translate(key, options ?? {});
}
