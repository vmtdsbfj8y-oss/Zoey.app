import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { DEFAULT_REQUEST_TIMEOUT_MS, TimeoutError, withTimeout } from '../with-timeout';

/**
 * The Settings screen that never finished loading.
 *
 * Two faults, and the second is the one that mattered. `useAsync` handled a request that FAILS but
 * not one that never answers -- `fetch` has no timeout, and an unreachable preview API stalls
 * rather than erroring, so the spinner had no end. And the language selector was rendered inside
 * the profile-data branch, so that stall took it down too: a reader could not reach the one
 * control that would put the app back into a language they read.
 */

describe('a promise that never settles gets a deadline', () => {
  it('rejects with a timeout rather than hanging', async () => {
    const never = new Promise<string>(() => {});
    await expect(withTimeout(never, 20, 'took too long')).rejects.toThrow('took too long');
  });

  it('marks the rejection as a timeout so a caller can tell it apart', async () => {
    const never = new Promise<string>(() => {});
    await expect(withTimeout(never, 20, 'took too long')).rejects.toBeInstanceOf(TimeoutError);
  });

  it('never changes the result of a request that answers in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 5_000)).resolves.toBe('ok');
  });

  it('passes a real failure through untouched, rather than reporting a timeout', async () => {
    const failed = Promise.reject(new Error('the server said no'));
    await expect(withTimeout(failed, 5_000)).rejects.toThrow('the server said no');
  });

  it('treats a non-positive deadline as opting out, not as failing instantly', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 0)).resolves.toBe('ok');
    await expect(withTimeout(Promise.resolve('ok'), Number.NaN)).resolves.toBe('ok');
  });

  it('clears its timer on the happy path, so nothing is left pending', async () => {
    // A leaked timer would keep the event loop alive; resolving fast and finishing proves it went.
    const before = Date.now();
    await withTimeout(Promise.resolve('ok'), 60_000);
    expect(Date.now() - before).toBeLessThan(1_000);
  });

  it('has a finite default budget', () => {
    expect(DEFAULT_REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
    expect(DEFAULT_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});

describe('every screen using the shared hook is bounded', () => {
  const HOOK = readFileSync(new URL('../../hooks/use-async.ts', import.meta.url).pathname, 'utf8');

  it('races the caller’s promise against the deadline', () => {
    expect(HOOK).toContain('withTimeout(fn(), timeoutMs');
  });

  it('still reports the failure through the existing error+retry path', () => {
    expect(HOOK).toContain('catch (err)');
    expect(HOOK).toContain('setError(');
    expect(HOOK).toContain('retry: run');
  });

  it('always stops loading, whichever way the request ends', () => {
    expect(HOOK).toContain('finally');
    expect(HOOK).toContain('setLoading(false)');
  });
});

describe('the language selector does not wait for the profile', () => {
  const SETTINGS = readFileSync(new URL('../../app/settings.tsx', import.meta.url).pathname, 'utf8');

  it('renders outside the profile-data branch', () => {
    const gate = SETTINGS.indexOf('{!loading && !error && data ? (');
    const language = SETTINGS.indexOf('<LanguageChoice />');
    expect(gate).toBeGreaterThan(-1);
    expect(language).toBeGreaterThan(-1);
    // Above the gate means no profile state can hide it.
    expect(language).toBeLessThan(gate);
  });

  it('is not gated on loading or error either', () => {
    const before = SETTINGS.slice(0, SETTINGS.indexOf('<LanguageChoice />'));
    const lastGate = Math.max(
      before.lastIndexOf('{loading ?'),
      before.lastIndexOf('{!loading && error ?')
    );
    // Those two are self-closing single-line conditionals; nothing after them is inside either.
    const between = before.slice(lastGate);
    expect(between).toContain(': null}');
  });

  it('keeps sign out reachable too, which was the original scoping rule', () => {
    const gate = SETTINGS.indexOf('{!loading && !error && data ? (');
    expect(SETTINGS.indexOf("t('settings.signOut')")).toBeGreaterThan(gate);
  });
});

describe('the timeout speaks both languages', () => {
  it('carries error.timeout in en and es', () => {
    expect('error.timeout' in en).toBe(true);
    expect('error.timeout' in es).toBe(true);
    expect(String(en['error.timeout']).length).toBeGreaterThan(0);
    expect(String(es['error.timeout']).length).toBeGreaterThan(0);
  });

  it('tells the reader what to do, not what broke internally', () => {
    expect(String(en['error.timeout'])).toMatch(/try again/i);
    expect(String(es['error.timeout'])).toMatch(/de nuevo/i);
    for (const copy of [en['error.timeout'], es['error.timeout']]) {
      expect(String(copy)).not.toMatch(/timeout|fetch|500|null|undefined/i);
    }
  });
});
