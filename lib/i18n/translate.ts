import { pluralCategory } from './format';
import { DEFAULT_LOCALE, isPlural, type Locale, type Message, type Resource } from './types';

/**
 * Turning a key into a string.
 *
 * Three behaviours matter more than the mechanics:
 *
 * ENGLISH IS ALWAYS THE FLOOR. A missing Spanish key falls back to English, never to a blank, never
 * to the raw key. A consumer seeing an English sentence in a Spanish screen has a cosmetic problem;
 * a consumer seeing `settings.language.title` has a broken app.
 *
 * GAPS ARE LOUD IN DEVELOPMENT AND SILENT IN PRODUCTION. `__DEV__` and test runs report a missing or
 * mistyped key through `onMissing`, so it surfaces while somebody can fix it. Shipping that warning
 * to a consumer's console would help nobody.
 *
 * INTERPOLATION NEVER LEAKS A PLACEHOLDER. An unfilled `{name}` is left exactly as written rather
 * than replaced with "undefined", which makes the bug obvious in review instead of shipping a
 * sentence that reads as though the app forgot who the consumer is.
 */

export type Values = Record<string, string | number>;

export interface TranslateOptions {
  /** Selects the plural form and is available to interpolation as `{count}`. */
  count?: number;
  values?: Values;
}

/** Reported when a key is absent or the wrong shape. Wired to console in dev, to assertions in tests. */
export type MissingHandler = (info: { key: string; locale: Locale; reason: MissingReason }) => void;
export type MissingReason = 'MISSING_IN_LOCALE' | 'MISSING_EVERYWHERE' | 'EXPECTED_PLURAL' | 'UNEXPECTED_PLURAL';

let onMissing: MissingHandler | null = null;
export function setMissingHandler(handler: MissingHandler | null): void {
  onMissing = handler;
}
function report(key: string, locale: Locale, reason: MissingReason): void {
  onMissing?.({ key, locale, reason });
}

const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(template: string, values?: Values): string {
  if (!values) return template;
  return template.replace(PLACEHOLDER, (whole, name: string) => {
    const value = values[name];
    /* Left intact on purpose -- see the note above about not shipping "undefined". */
    return value === undefined || value === null ? whole : String(value);
  });
}

function resolveMessage(message: Message, key: string, locale: Locale, count?: number): string | null {
  if (isPlural(message)) {
    if (count === undefined) {
      report(key, locale, 'UNEXPECTED_PLURAL');
      return message.other;
    }
    const category = pluralCategory(count, locale);
    return category === 'one' ? message.one : message.other;
  }
  if (count !== undefined && typeof message === 'string') {
    /* A count was supplied for a non-plural message. Usable, but almost always an authoring mistake. */
    report(key, locale, 'EXPECTED_PLURAL');
  }
  return typeof message === 'string' ? message : null;
}

/**
 * The translator. `resources` is the active locale's table, `fallback` is always English.
 */
export function createTranslator(locale: Locale, resources: Resource, fallback: Resource) {
  return function t(key: string, options: TranslateOptions = {}): string {
    const { count, values } = options;

    let message: Message | undefined = resources[key];
    if (message === undefined) {
      if (locale !== DEFAULT_LOCALE) report(key, locale, 'MISSING_IN_LOCALE');
      message = fallback[key];
    }

    if (message === undefined) {
      report(key, locale, 'MISSING_EVERYWHERE');
      /*
       * The last line of defence. Returning the key would put an identifier on a consumer's screen;
       * returning the final segment produces something readable ("title") while the dev handler makes
       * sure the real problem is not invisible.
       */
      const tail = key.split('.').pop() ?? key;
      return tail;
    }

    const resolvedLocale = resources[key] === undefined ? DEFAULT_LOCALE : locale;
    const text = resolveMessage(message, key, resolvedLocale, count);
    if (text === null) return key.split('.').pop() ?? key;

    return interpolate(text, count === undefined ? values : { count, ...values });
  };
}

export type Translator = ReturnType<typeof createTranslator>;
