import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { clientStateCopy, clientStateKeys, TRANSLATABLE_CLIENT_STATES } from '../client-state-copy';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { createTranslator } from '../i18n/translate';

const ROOT = join(__dirname, '..', '..');
const t = (locale: 'en' | 'es') => {
  const table = locale === 'en' ? en : es;
  const translate = createTranslator(locale, table, en);
  return (key: string) => translate(key);
};

/**
 * The defect: Spanish chrome around an English headline.
 *
 * `/api/mobile/results` sends a client state as a closed enum plus English prose. That prose is a
 * static seven-entry lookup on the engine -- no interpolation, no model output, no client data -- so
 * the app renders it from the enum instead of shipping the sentence to the screen.
 *
 * These tests hold the two halves of that bargain: Spanish readers get Spanish, and English readers
 * get EXACTLY what the engine would have shown them.
 */

/**
 * Transcribed from the engine's own table, `lib/credit/mobile-client-state.ts`.
 *
 * Deliberately duplicated here rather than imported: the engine is a separate service that is not
 * on disk in CI, and the point of this test is to fail loudly if the app's English ever drifts from
 * what the engine sends. A shared import could not detect that -- it would just agree with itself.
 */
const ENGINE_ENGLISH: Record<string, { headline: string; detail: string }> = {
  CLIENT_QUESTIONS_REQUIRED: {
    headline: 'Zoey needs a few answers',
    detail: 'Answer the questions below so Zoey can finish your strategy.',
  },
  DOCUMENTS_HELD: {
    headline: 'Zoey is finishing your disputes',
    detail:
      'Some dispute documents are still being prepared. There is nothing you need to do right now.',
  },
  READY_TO_SIGN: {
    headline: 'Your disputes are ready',
    detail: 'Review your prepared disputes and sign to continue.',
  },
  SIGNED_WAITING_OWNER: {
    headline: 'Signed',
    detail:
      'Your dispute round is with Pinnacle for final review. Nothing else is needed from you right now.',
  },
  OWNER_REVIEW: {
    headline: 'With your specialist',
    detail: 'Pinnacle is reviewing your dispute round. Nothing else is needed from you right now.',
  },
  ZOEY_WORKING: {
    headline: 'Zoey is working',
    detail: 'Your file is being reviewed. There is nothing you need to do right now.',
  },
  NOTHING_REQUIRED: {
    headline: 'Nothing outstanding',
    detail: 'There is nothing you need to do right now.',
  },
};

describe('English readers see exactly what the engine sends', () => {
  it('covers every state the engine can resolve', () => {
    expect([...TRANSLATABLE_CLIENT_STATES].sort()).toEqual(Object.keys(ENGINE_ENGLISH).sort());
  });

  it('reproduces the engine copy byte for byte', () => {
    const translate = t('en');
    for (const [state, expected] of Object.entries(ENGINE_ENGLISH)) {
      const copy = clientStateCopy(
        { state, headline: 'SENTINEL-HEADLINE', detail: 'SENTINEL-DETAIL' },
        translate
      );
      expect(copy?.headline, `${state} headline`).toBe(expected.headline);
      expect(copy?.detail, `${state} detail`).toBe(expected.detail);
    }
  });

  /**
   * The sentinels above are what make the previous test mean something: if the resolver ever fell
   * back to the engine's payload instead of translating, English would still "pass" while Spanish
   * silently broke. Here the payload is deliberately wrong, so a fallback is visible.
   */
  it('translates rather than echoing the payload', () => {
    const copy = clientStateCopy(
      { state: 'OWNER_REVIEW', headline: 'SENTINEL-HEADLINE', detail: 'SENTINEL-DETAIL' },
      t('en')
    );
    expect(copy?.headline).not.toContain('SENTINEL');
    expect(copy?.detail).not.toContain('SENTINEL');
  });
});

describe('Spanish readers get Spanish', () => {
  it('returns Spanish for every state, and never the English string', () => {
    const spanish = t('es');
    for (const state of TRANSLATABLE_CLIENT_STATES) {
      const copy = clientStateCopy({ state, headline: 'x', detail: 'y' }, spanish);
      expect(copy, state).not.toBeNull();
      expect(copy!.headline, `${state} headline still English`).not.toBe(
        ENGINE_ENGLISH[state].headline
      );
      expect(copy!.detail, `${state} detail still English`).not.toBe(ENGINE_ENGLISH[state].detail);
    }
  });

  it('has a real Spanish entry for every key, not an English fallback', () => {
    for (const state of TRANSLATABLE_CLIENT_STATES) {
      const keys = clientStateKeys(state)!;
      for (const key of [keys.headline, keys.detail]) {
        expect(es[key], `${key} missing from es`).toBeDefined();
        expect(es[key], `${key} identical to en`).not.toBe(en[key]);
      }
    }
  });

  it('reads as Spanish, not as English with accents', () => {
    const spanish = t('es');
    const all = TRANSLATABLE_CLIENT_STATES.map((s) =>
      [clientStateCopy({ state: s, headline: 'x', detail: 'y' }, spanish)!.headline,
       clientStateCopy({ state: s, headline: 'x', detail: 'y' }, spanish)!.detail].join(' ')
    ).join(' ');
    /* Function words a genuine Spanish translation of these seven states cannot avoid. */
    for (const word of [' su ', ' de ', ' para ', ' nada ']) {
      expect(all.toLowerCase(), `expected ${word.trim()}`).toContain(word);
    }
  });
});

describe('no client data is ever routed through these strings', () => {
  /**
   * The whole architecture rests on this copy being product prose. If a placeholder ever appeared,
   * the engine would have started interpolating a creditor, a bureau or an amount into a sentence
   * this app translates -- and translating source evidence is precisely what must not happen.
   */
  it('carries no interpolation placeholders in either language', () => {
    for (const state of TRANSLATABLE_CLIENT_STATES) {
      const keys = clientStateKeys(state)!;
      for (const key of [keys.headline, keys.detail]) {
        for (const [label, table] of [['en', en], ['es', es]] as const) {
          const value = table[key];
          expect(typeof value, `${label} ${key}`).toBe('string');
          expect(value as string, `${label} ${key} has a placeholder`).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });
});

describe('an unfamiliar state degrades to the engine words, not to a blank', () => {
  it('passes the payload through when the state is unknown', () => {
    const copy = clientStateCopy(
      { state: 'SOME_FUTURE_STATE', headline: 'Engine headline', detail: 'Engine detail' },
      t('es')
    );
    expect(copy).toEqual({ headline: 'Engine headline', detail: 'Engine detail' });
  });

  it('returns null when there is no state at all', () => {
    expect(clientStateCopy(null, t('en'))).toBeNull();
    expect(clientStateKeys(undefined)).toBeNull();
  });
});

describe('every screen that shows this copy goes through the resolver', () => {
  /**
   * A screen rendering `clientState.headline` directly is the regression: it would look correct in
   * English and be the original bug in Spanish.
   */
  const SITES = [
    'components/credit/credit-modules.tsx',
    'components/results/case-command-center.tsx',
    'components/results/result-views.tsx',
  ];

  it('imports the resolver on every surface that renders the state', () => {
    for (const file of SITES) {
      const src = readFileSync(join(ROOT, file), 'utf8');
      expect(src, file).toContain('clientStateCopy');
    }
  });

  it('renders no raw clientState prose', () => {
    for (const file of SITES) {
      const src = readFileSync(join(ROOT, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, ' ');
      /* `{state.headline}` / `{results.clientState.detail}` with nothing resolving them first. */
      expect(src, `${file} renders a raw headline`).not.toMatch(/\{\s*(?:results\.)?(?:clientState|state)\.headline\s*\}/);
      expect(src, `${file} renders a raw detail`).not.toMatch(/\{\s*(?:results\.)?(?:clientState|state)\.detail\s*\}/);
    }
  });
});
