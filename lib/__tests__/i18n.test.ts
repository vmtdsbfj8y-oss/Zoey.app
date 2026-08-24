import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { en } from '../i18n/en';
import { es } from '../i18n/es';
import * as fmt from '../i18n/format';
import { localeCacheKey, resolveLocale, shouldSyncToServer } from '../i18n/preference';
import { createTranslator, interpolate, setMissingHandler } from '../i18n/translate';
import { DEFAULT_LOCALE, LOCALES, isLocale, isPlural, normalizeLocale } from '../i18n/types';

const ROOT = join(__dirname, '..', '..');

afterEach(() => setMissingHandler(null));

describe('English and Spanish stay in step', () => {
  it('has exactly the same key set in both languages', () => {
    const a = Object.keys(en).sort();
    const b = Object.keys(es).sort();
    expect(a.filter((k) => !(k in es)), 'missing from Spanish').toEqual([]);
    expect(b.filter((k) => !(k in en)), 'present only in Spanish').toEqual([]);
    expect(a).toEqual(b);
  });

  it('agrees on which messages are plural', () => {
    for (const key of Object.keys(en)) {
      expect(isPlural(es[key]), `${key} plural shape`).toBe(isPlural(en[key]));
    }
  });

  it('uses the same interpolation placeholders in both languages', () => {
    const names = (m: unknown): string[] => {
      const text = typeof m === 'string' ? m : Object.values(m as object).join(' ');
      return [...text.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();
    };
    for (const key of Object.keys(en)) {
      expect(names(es[key]), `${key} placeholders`).toEqual(names(en[key]));
    }
  });

  it('never ships an empty string', () => {
    for (const table of [en, es]) {
      for (const [key, message] of Object.entries(table)) {
        const values = isPlural(message) ? [message.one, message.other] : [message];
        for (const v of values) expect(v.trim().length, key).toBeGreaterThan(0);
      }
    }
  });

  it('keeps brand names untranslated', () => {
    const spanish = Object.values(es)
      .map((m) => (isPlural(m) ? `${m.one} ${m.other}` : m))
      .join(' ');
    for (const brand of ['Zoey', 'Pinnacle']) expect(spanish).toContain(brand);
    /* Common mistranslations of the product name. */
    for (const wrong of ['Zoé', 'Pináculo', 'Capital Pinnacle']) expect(spanish).not.toContain(wrong);
  });

  it('contains no PII-shaped value in either resource', () => {
    const all = JSON.stringify({ en, es });
    expect(all).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/); // SSN
    expect(all).not.toMatch(/\b(?:\d[ -]*?){13,16}\b/); // card/account number
    /* The support address is intentional and is the only email permitted. */
    const emails = [...all.matchAll(/[\w.%+-]+@[\w.-]+\.\w{2,}/g)].map((m) => m[0]);
    expect([...new Set(emails)].filter((e) => e !== 'info@pinnaclecapitalusa.com')).toEqual([]);
  });
});

describe('translation behaviour', () => {
  const t = (locale: 'en' | 'es') => createTranslator(locale, locale === 'en' ? en : es, en);

  it('returns the active language', () => {
    expect(t('en')('settings.title')).toBe('Settings');
    expect(t('es')('settings.title')).toBe('Configuración');
  });

  it('falls back to English for a key missing in Spanish', () => {
    const partial = { 'settings.title': 'Configuración' };
    const translate = createTranslator('es', partial, en);
    expect(translate('settings.title')).toBe('Configuración');
    expect(translate('common.cancel')).toBe('Cancel');
  });

  it('reports a missing key rather than hiding it', () => {
    const seen: string[] = [];
    setMissingHandler(({ key, reason }) => seen.push(`${reason}:${key}`));
    createTranslator('es', {}, en)('common.cancel');
    expect(seen).toContain('MISSING_IN_LOCALE:common.cancel');
  });

  it('never puts a raw key on screen when a key is unknown everywhere', () => {
    const out = createTranslator('en', {}, {})('some.unknown.thing');
    expect(out).toBe('thing');
    expect(out).not.toContain('.');
  });

  it('interpolates, and leaves an unfilled placeholder visible', () => {
    expect(interpolate('Hi {name}', { name: 'Sam' })).toBe('Hi Sam');
    expect(interpolate('Hi {name}', {})).toBe('Hi {name}');
    expect(interpolate('Hi {name}', { name: 'Sam' })).not.toContain('undefined');
  });

  it('pluralises in both languages', () => {
    expect(t('en')('documents.itemsReceived', { count: 1 })).toBe('1 document received');
    expect(t('en')('documents.itemsReceived', { count: 3 })).toBe('3 documents received');
    expect(t('es')('documents.itemsReceived', { count: 1 })).toBe('1 documento recibido');
    expect(t('es')('documents.itemsReceived', { count: 3 })).toBe('3 documentos recibidos');
    expect(t('es')('documents.itemsNeeded', { count: 1 })).toBe('Falta 1 documento');
    expect(t('es')('documents.itemsNeeded', { count: 4 })).toBe('Faltan 4 documentos');
  });
});

describe('formatting follows the locale', () => {
  const when = Date.UTC(2026, 2, 9, 15, 30);

  it('formats dates in each language', () => {
    expect(fmt.formatDate(when, 'en')).toMatch(/March/);
    expect(fmt.formatDate(when, 'es').toLowerCase()).toMatch(/marzo/);
  });

  it('uses US conventions for Spanish, not Iberian ones', () => {
    /* A US consumer reading a US credit report expects US money and US separators. */
    expect(fmt.formatCurrencyCents(129900, 'es')).toContain('1,299');
    expect(fmt.formatCurrencyCents(129900, 'en')).toContain('1,299');
    expect(fmt.localeTag('es')).toBe('es-US');
  });

  it('formats currency, numbers and percentages', () => {
    expect(fmt.formatCurrencyCents(2999, 'en')).toBe('$29.99');
    expect(fmt.formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(fmt.formatPercent(32, 'en')).toBe('32%');
    expect(fmt.formatPercent(32, 'es')).toContain('32');
  });

  it('returns an empty string rather than throwing on a bad value', () => {
    expect(fmt.formatDate(Number.NaN, 'en')).toBe('');
    expect(fmt.formatNumber(Number.NaN, 'en')).toBe('NaN');
  });
});

describe('which language a consumer gets', () => {
  it('follows an English device', () => {
    expect(resolveLocale({ deviceLocale: 'en-US' })).toEqual({ locale: 'en', source: 'device' });
  });

  it('follows a Spanish device, including a regional tag', () => {
    expect(resolveLocale({ deviceLocale: 'es' })).toEqual({ locale: 'es', source: 'device' });
    expect(resolveLocale({ deviceLocale: 'es-MX' })).toEqual({ locale: 'es', source: 'device' });
    expect(resolveLocale({ deviceLocale: 'es-419' })).toEqual({ locale: 'es', source: 'device' });
  });

  it('falls back to English for an unsupported device language', () => {
    for (const tag of ['fr-FR', 'pt-BR', 'zh-Hans', '', 'nonsense']) {
      expect(resolveLocale({ deviceLocale: tag }).locale, tag).toBe('en');
    }
  });

  it('lets a saved preference beat the device', () => {
    expect(resolveLocale({ serverLocale: 'es', deviceLocale: 'en-US' })).toEqual({ locale: 'es', source: 'server' });
    expect(resolveLocale({ serverLocale: 'en', deviceLocale: 'es-MX' })).toEqual({ locale: 'en', source: 'server' });
  });

  it('prefers the server over a stale local cache', () => {
    expect(resolveLocale({ serverLocale: 'en', cachedLocale: 'es' }).locale).toBe('en');
  });

  it('uses the local cache when the server is unreachable', () => {
    expect(resolveLocale({ cachedLocale: 'es', deviceLocale: 'en-US' })).toEqual({ locale: 'es', source: 'cache' });
  });

  it('ignores a malformed stored value instead of trusting it', () => {
    for (const bad of ['EN', 'english', 'es-MX', 42, null, {}, 'de']) {
      expect(resolveLocale({ serverLocale: bad, deviceLocale: 'en-US' }).locale, String(bad)).toBe('en');
    }
  });

  it('keys the cache per account so one consumer cannot inherit another', () => {
    expect(localeCacheKey('a')).not.toBe(localeCacheKey('b'));
    expect(localeCacheKey(null)).toBe('zoey.locale.anonymous');
    expect(localeCacheKey('a')).not.toContain('@');
  });

  it('pushes an offline choice up only when the server has none', () => {
    expect(shouldSyncToServer('es', undefined)).toBe(true);
    expect(shouldSyncToServer('es', 'en')).toBe(false);
    expect(shouldSyncToServer(undefined, undefined)).toBe(false);
  });
});

describe('locale values are validated everywhere they enter', () => {
  it('accepts only the supported set', () => {
    expect(LOCALES).toEqual(['en', 'es']);
    expect(DEFAULT_LOCALE).toBe('en');
    for (const good of ['en', 'es']) expect(isLocale(good)).toBe(true);
    for (const bad of ['EN', 'en-US', 'fr', '', null, 7]) expect(isLocale(bad)).toBe(false);
  });

  it('normalises a device tag to a supported language', () => {
    expect(normalizeLocale('es-419')).toBe('es');
    expect(normalizeLocale('EN-gb')).toBe('en');
    expect(normalizeLocale('ja')).toBe('en');
  });

  it('the profile API rejects anything outside the set', () => {
    const route = readFileSync(join(ROOT, 'api', 'profile.ts'), 'utf8');
    expect(route).toContain("body.locale !== 'en' && body.locale !== 'es'");
    expect(route).toContain('next.locale = body.locale');
  });

  it('the chat request sends a narrowed locale', () => {
    const api = readFileSync(join(ROOT, 'lib', 'chat-api.ts'), 'utf8');
    expect(api).toContain("locale: locale === 'es' ? 'es' : 'en'");
  });
});

describe('legal acceptance records the language it was shown in', () => {
  it('stamps the locale alongside the version', async () => {
    const { signupAcceptance } = await import('../legal');
    const records = signupAcceptance(1_700_000_000_000, 'es');
    expect(records).toHaveLength(2);
    for (const r of records) {
      expect(r.locale).toBe('es');
      expect(r.version).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(r.acceptedAt).toBe(1_700_000_000_000);
    }
  });

  it('leaves the document version untouched by language', async () => {
    const { signupAcceptance } = await import('../legal');
    const enRecords = signupAcceptance(1, 'en');
    const esRecords = signupAcceptance(1, 'es');
    expect(esRecords.map((r) => r.version)).toEqual(enRecords.map((r) => r.version));
  });

  it('the server persists the displayed locale on the acceptance record', () => {
    const route = readFileSync(join(ROOT, 'api', 'profile.ts'), 'utf8');
    expect(route).toContain('const shown = (entry as { locale?: unknown }).locale');
    expect(route).toContain("shown === 'en' || shown === 'es'");
  });
});

describe('the Spanish legal position is stated honestly', () => {
  it('tells a Spanish reader the documents are still in English', () => {
    expect(es['language.documentNote']).toMatch(/inglés/);
    expect(es['language.documentNote']).toMatch(/abogado biling/);
    const viewer = readFileSync(join(ROOT, 'app', 'legal', '[doc].tsx'), 'utf8');
    expect(viewer).toContain("locale !== 'en'");
    expect(viewer).toContain("t('language.documentNote')");
  });

  it('adds no guarantee and claims no authority in Spanish', () => {
    const spanish = Object.values(es)
      .map((m) => (isPlural(m) ? `${m.one} ${m.other}` : m))
      .join(' ')
      .toLowerCase();
    /* Claims of capability or authority. These may not appear at all. */
    for (const forbidden of [
      'garantizamos',
      'eliminación garantizada',
      'aumento garantizado',
      'somos un buró',
      'somos un bufete',
      'monitoreo diario',
      'envío automático',
    ]) {
      expect(spanish, forbidden).not.toContain(forbidden);
    }

    /*
     * Semantic, not lexical. "asesoría legal" is the phrase the disclaimer is BUILT from -- "no
     * constituye asesoría legal" -- so a flat ban flagged the sentence written to prevent the claim.
     * Every sentence mentioning it must carry a negation.
     */
    for (const phrase of ['asesoría legal', 'asesor financiero', 'buró de crédito']) {
      const claims = spanish
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => sentence.includes(phrase))
        .filter((sentence) => !/\b(no|ni|nunca|sin)\b/.test(sentence));
      expect(claims, `unqualified use of "${phrase}"`).toEqual([]);
    }
    /* And it keeps the disclaimers it must keep. */
    expect(spanish).toContain('no se garantiza');
    expect(spanish).toContain('no es un bufete de abogados');
  });
});

/**
 * A scan, not a rule. It covers the screens that were localised in this change so a regression is
 * caught; the files still to be localised are listed explicitly rather than silently excluded, which
 * is what keeps the remaining work visible instead of forgotten.
 */
describe('localised screens do not regain hardcoded English', () => {
  /* Every consumer-facing screen and component. Kept explicit so adding one is a deliberate act. */
  const LOCALIZED = [
    'app/(tabs)/_layout.tsx', 'app/(tabs)/credit-score.tsx', 'app/(tabs)/disputes.tsx',
    'app/(tabs)/documents.tsx', 'app/(tabs)/index.tsx', 'app/(tabs)/more.tsx',
    'app/chat.tsx', 'app/connect-existing-file.tsx', 'app/credit-services.tsx',
    'app/goals.tsx', 'app/legal/[doc].tsx', 'app/legal/index.tsx', 'app/membership.tsx',
    'app/reset-password.tsx', 'app/settings.tsx', 'app/sign-in.tsx',
    'app/signed-acknowledgment.tsx', 'app/subscription.tsx', 'app/upload.tsx', 'app/welcome.tsx',
    'components/chat/chat-parts.tsx', 'components/credit-services/certified-mailing.tsx',
    'components/credit-services/intake-row.tsx', 'components/credit/credit-hero.tsx',
    'components/credit/credit-modules.tsx', 'components/credit/score-gauge.tsx',
    'components/disputes/free-dispute-status.tsx', 'components/documents/analysis-steps.tsx',
    'components/documents/document-row.tsx', 'components/documents/simple-service-status.tsx',
    'components/documents/upload-zone.tsx', 'components/documents/zoey-hero.tsx',
    'components/home/credit-score-card.tsx', 'components/home/dispute-rounds-card.tsx',
    'components/home/progress-gauge-card.tsx', 'components/home/zoey-header.tsx',
    'components/link/connect-account.tsx', 'components/more/states.tsx',
    'components/onboarding/consent-flow.tsx', 'components/onboarding/onboarding-gate.tsx',
    'components/premium/premium-lock.tsx', 'components/results/case-command-center.tsx',
    'components/results/dispute-signature.tsx', 'components/results/inquiry-questionnaire.tsx',
    'components/results/result-views.tsx', 'components/settings/language-choice.tsx',
    'components/tab-fab.tsx',
  ];

  /* Non-component modules use the runtime mirror instead of the hook. */
  const RUNTIME_MODULES = [
    'lib/auth-fetch.ts', 'lib/credit-facts.ts', 'lib/documents-store.tsx', 'lib/mobile-api.ts',
    'lib/mobile-confirmation.ts', 'lib/mobile-dispute-signature.ts', 'lib/mobile-documents.ts',
    'lib/mobile-results.ts', 'lib/oauth.ts', 'lib/supabase.ts', 'lib/upload-sources.ts',
  ];

  it('each localised screen actually uses the translator', () => {
    for (const file of LOCALIZED) {
      const src = readFileSync(join(ROOT, file), 'utf8');
      expect(src, file).toMatch(/useI18n\(\)|useT\(\)/);
      expect(src, file).toMatch(/\bt\(['"]/);
    }
  });

  it('every key those screens reference exists in English', () => {
    const missing: string[] = [];
    for (const file of [...LOCALIZED, ...RUNTIME_MODULES]) {
      const src = readFileSync(join(ROOT, file), 'utf8');
      for (const m of src.matchAll(/\b(?:t|tr)\(\s*'([a-z][\w.]*)'/g)) {
        if (!(m[1] in en)) missing.push(`${file}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('non-component modules use the runtime mirror', () => {
    for (const file of RUNTIME_MODULES) {
      const src = readFileSync(join(ROOT, file), 'utf8');
      expect(src, file).toMatch(/i18n\/runtime/);
      expect(src, file).toMatch(/\btr\('/);
    }
  });

  /**
   * The whole-app sweep. This is the assertion that "100% of non-legal UI is localised" is a fact
   * rather than a claim, and it is what will fail the day somebody adds an English literal.
   */
  it('no consumer-visible English literal remains anywhere in app/ or components/', () => {
    const GENERICS = new Set(['Promise', 'Record', 'Array', 'Partial', 'Map', 'Set', 'Awaited', 'Readonly', 'Omit', 'Pick']);
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (['node_modules', '.git', '.expo', '__tests__', '.next', 'dist'].includes(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.endsWith('.tsx')) continue;
        const code = readFileSync(full, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, ' ')
          .replace(/^\s*\/\/.*$/gm, ' ');
        for (const m of code.matchAll(/>\s*([A-Z][A-Za-z][^<>{}\n]{5,})\s*</g)) {
          const value = m[1].trim();
          if (GENERICS.has(value.split('<')[0])) continue;
          offenders.push(`${full.replace(ROOT, '')}: ${value.slice(0, 50)}`);
        }
        for (const m of code.matchAll(
          /(?:title|label|placeholder|accessibilityLabel|accessibilityHint|blurb|detail|body|message)="([^"]{5,})"/g
        )) {
          offenders.push(`${full.replace(ROOT, '')}: ${m[1].slice(0, 50)}`);
        }
      }
    };
    walk(join(ROOT, 'app'));
    walk(join(ROOT, 'components'));

    expect(offenders).toEqual([]);
  });

  /**
   * Ternaries were the second gap, and the one a rendered screenshot found rather than a scan.
   *
   * `{mode === 'sign-in' ? 'Sign In' : 'Create Account'}` is consumer copy that no quoted-prop scan
   * and no JSX-text scan matches, because it is an expression. Spanish sign-in shipped with English
   * tabs and an English "or continue with email" divider, and both were only visible by looking at
   * the screen.
   *
   * The filter below is what makes this checkable: most ternary string pairs in this codebase are
   * CSS classes, colours, icon names and autocomplete tokens, which are not copy. A pair counts as
   * copy when it contains a space or sentence punctuation and is not a style value.
   */
  it('no JSX ternary chooses between two hardcoded English strings', () => {
    const offenders: string[] = [];
    const TERNARY = /\?\s*'([^']{3,})'\s*:\s*'([^']{3,})'/g;
    const isStyleish = (v: string) =>
      /^(rgba?\(|#[0-9a-f]{3,8}$|[a-z-]+:|text-|bg-|border-|font-|flex-|items-|justify-)/i.test(v) ||
      /^[a-z]+([-.][a-z0-9]+)+$/i.test(v) ||        // icon.names, current-password
      !/[ .!?…]/.test(v);                            // single tokens: 'none', 'words', 'user'

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (['node_modules', '.git', '.expo', '__tests__', '.next', 'dist'].includes(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.endsWith('.tsx')) continue;
        const code = readFileSync(full, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, ' ')
          .replace(/^\s*\/\/.*$/gm, ' ');
        for (const m of code.matchAll(TERNARY)) {
          const [a, b] = [m[1], m[2]];
          if (isStyleish(a) && isStyleish(b)) continue;
          /* `t(cond ? 'a.key' : 'b.key')` is the correct pattern, not an offender. */
          if (a in en && b in en) continue;
          if (!/[A-Za-z]{3}/.test(a) && !/[A-Za-z]{3}/.test(b)) continue;
          offenders.push(`${full.replace(ROOT, '')}: '${a.slice(0, 30)}' / '${b.slice(0, 30)}'`);
        }
      }
    };
    walk(join(ROOT, 'app'));
    walk(join(ROOT, 'components'));

    expect(offenders).toEqual([]);
  });

  /**
   * Lowercase JSX text was the third gap: the sweep required a capital first letter, so the divider
   * "or continue with email" was invisible to it.
   */
  it('no lowercase JSX text node is hardcoded English', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (['node_modules', '.git', '.expo', '__tests__', '.next', 'dist'].includes(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.endsWith('.tsx')) continue;
        const code = readFileSync(full, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, ' ')
          .replace(/^\s*\/\/.*$/gm, ' ');
        for (const m of code.matchAll(/>\s*([a-z][a-z ]{6,}[a-z])\s*</g)) {
          offenders.push(`${full.replace(ROOT, '')}: ${m[1].slice(0, 40)}`);
        }
      }
    };
    walk(join(ROOT, 'app'));
    walk(join(ROOT, 'components'));

    expect(offenders).toEqual([]);
  });

  /**
   * Template literals were the gap the string sweep could not see.
   *
   * `accessibilityLabel={`Delete ${goal.title}`}` is a hardcoded English label with an interpolated
   * value, so it never matched a quoted-string scan. Eleven of them survived a pass that reported
   * full coverage, and every one was a screen-reader label -- the strings a sighted reviewer never
   * notices are missing. Interpolation belongs in the resource, via `t(key, { values })`.
   */
  it('no prop is built from a hardcoded English template literal', () => {
    const offenders: string[] = [];
    const PROPS = /(accessibilityLabel|accessibilityHint|title|label|placeholder|blurb|detail|body|message)=\{`([^`]*)`\}/g;

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (['node_modules', '.git', '.expo', '__tests__', '.next', 'dist'].includes(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.endsWith('.tsx')) continue;
        const code = readFileSync(full, 'utf8');
        for (const m of code.matchAll(PROPS)) {
          const template = m[2];
          /* A template made only of interpolations is fine; English words in it are not. */
          const literalText = template.replace(/\$\{[^}]*\}/g, ' ').trim();
          if (/[A-Za-z]{4,}/.test(literalText)) {
            offenders.push(`${full.replace(ROOT, '')}: ${m[1]}={\`${template.slice(0, 45)}\`}`);
          }
        }
      }
    };
    walk(join(ROOT, 'app'));
    walk(join(ROOT, 'components'));

    expect(offenders).toEqual([]);
  });
});
