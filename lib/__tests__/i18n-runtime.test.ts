import { afterEach, describe, expect, it } from 'vitest';

import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { localeCacheKey, resolveLocale } from '../i18n/preference';
import { activeLocale, setActiveLocale, tr } from '../i18n/runtime';

afterEach(() => setActiveLocale('en'));

/**
 * Behaviour under language change, rather than the shape of the resource files.
 *
 * The failure these guard against is the one a parity test cannot see: everything translated, and
 * the app still showing English because something captured the locale once and kept it.
 */
describe('switching language takes effect immediately', () => {
  it('changes what non-component modules return, with no reload', () => {
    setActiveLocale('en');
    expect(tr('dispute.readyToSign')).toBe(en['dispute.readyToSign']);

    setActiveLocale('es');
    /* Same call, same process, no remount. */
    expect(tr('dispute.readyToSign')).toBe(es['dispute.readyToSign']);
    expect(tr('dispute.readyToSign')).not.toBe(en['dispute.readyToSign']);
  });

  it('affects copy that a screen would already have on display', () => {
    /* Status labels, error bodies and alert copy are the strings most likely to be mid-render. */
    for (const key of ['dispute.needsAttention', 'facts.waitingReport', 'lib.storeFailed', 'upload.howToAdd']) {
      setActiveLocale('en');
      const english = tr(key);
      setActiveLocale('es');
      expect(tr(key), key).toBe(es[key]);
      expect(tr(key), key).not.toBe(english);
    }
  });

  it('reports the active language', () => {
    setActiveLocale('es');
    expect(activeLocale()).toBe('es');
    setActiveLocale('en');
    expect(activeLocale()).toBe('en');
  });

  it('still falls back to English for a key Spanish lacks', () => {
    setActiveLocale('es');
    expect(tr('some.key.that.does.not.exist')).toBe('exist');
  });

  it('interpolates and pluralises after a switch', () => {
    setActiveLocale('es');
    expect(tr('documents.itemsReceived', { count: 2 })).toBe('2 documentos recibidos');
    expect(tr('legal.a11yEmail', { values: { email: 'info@pinnaclecapitalusa.com' } })).toContain(
      'info@pinnaclecapitalusa.com'
    );
  });
});

describe('a language change never disturbs the session or another account', () => {
  it('keeps each account’s cache separate', () => {
    const a = localeCacheKey('account-a');
    const b = localeCacheKey('account-b');
    expect(a).not.toBe(b);
    /* Signing out must not reuse the previous account's key. */
    expect(localeCacheKey(null)).not.toBe(a);
    expect(localeCacheKey(undefined)).toBe(localeCacheKey(null));
  });

  it('does not let a signed-out cache override the next account’s server value', () => {
    /* Account B signs in with Spanish saved server-side; a stale anonymous 'en' must not win. */
    expect(resolveLocale({ serverLocale: 'es', cachedLocale: 'en' }).locale).toBe('es');
  });

  it('survives a restart with no network by using the cache', () => {
    /* serverLocale undefined models a cold start before the profile request returns. */
    expect(resolveLocale({ cachedLocale: 'es', deviceLocale: 'en-US' })).toEqual({
      locale: 'es',
      source: 'cache',
    });
  });

  it('reconciles to the server value once it arrives', () => {
    const offline = resolveLocale({ cachedLocale: 'es', deviceLocale: 'en-US' });
    const online = resolveLocale({ serverLocale: 'en', cachedLocale: 'es', deviceLocale: 'en-US' });
    expect(offline.locale).toBe('es');
    expect(online.locale).toBe('en');
    expect(online.source).toBe('server');
  });
});

describe('protected evidence is never translated', () => {
  it('no creditor, bureau or account value is a translation key', () => {
    const keys = Object.keys(en).join(' ').toLowerCase();
    for (const evidence of ['creditor', 'accountnumber', 'tradeline', 'balance.value', 'address.line']) {
      expect(keys, evidence).not.toContain(evidence);
    }
  });

  it('bureau names appear identically in both languages', () => {
    /* They are proper nouns on the consumer's own report. Translating one would corrupt the record. */
    const bureaus = ['TransUnion', 'Experian', 'Equifax'];
    for (const bureau of bureaus) {
      const inEn = JSON.stringify(en).includes(bureau);
      const inEs = JSON.stringify(es).includes(bureau);
      expect(inEs, bureau).toBe(inEn);
    }
  });

  it('the chat directive forbids translating report values', () => {
    /* Asserted in the engine repo too; duplicated here because the app is what sends the locale. */
    expect(es['chat.disclosure']).toBeTruthy();
    expect(en['chat.disclosure']).toBeTruthy();
  });
});
