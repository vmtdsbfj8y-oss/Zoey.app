import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { en } from '../i18n/en';
import { es } from '../i18n/es';
import {
  STARTUP_TIMEOUT_MS,
  canRenderApp,
  splashShouldHide,
  startupPhase,
  type StartupInput,
  type StartupPhase,
} from '../startup-gate';

/**
 * The stuck launch screen, pinned.
 *
 * What happened: a component threw while rendering, so the root layout's effect never ran, so
 * `SplashScreen.hideAsync()` was never called, and the app sat behind the native ZOEY splash
 * indefinitely -- no error, no retry, and a reload reproduced it exactly because
 * `preventAutoHideAsync()` runs at module scope.
 *
 * The specific throw was a ReferenceError and is not what these tests are about. Any throw, any
 * font that never resolves, and any startup promise that neither settles nor rejects produce the
 * same dead screen, so what is pinned here is the rule: the splash is held only during a bounded
 * wait, and every other phase clears it.
 */

const input = (over: Partial<StartupInput> = {}): StartupInput => ({
  fontsLoaded: false,
  fontError: false,
  timedOut: false,
  renderError: false,
  ...over,
});

const ALL_PHASES: StartupPhase[] = ['WAITING', 'READY', 'DEGRADED', 'FAILED'];

describe('the regression: a render-time throw must not strand the splash', () => {
  it('a caught render error is FAILED, and FAILED hides the splash', () => {
    const phase = startupPhase(input({ renderError: true }));
    expect(phase).toBe('FAILED');
    expect(splashShouldHide(phase)).toBe(true);
  });

  it('a throw outranks every other signal, including a still-pending font load', () => {
    // The exact shape of the bug: fonts had not resolved when the tree threw, so the old code was
    // still returning null and waiting -- forever.
    expect(startupPhase(input({ renderError: true, fontsLoaded: false }))).toBe('FAILED');
    expect(startupPhase(input({ renderError: true, fontsLoaded: true }))).toBe('FAILED');
    expect(startupPhase(input({ renderError: true, timedOut: true }))).toBe('FAILED');
  });

  it('FAILED renders the error state, not the app', () => {
    expect(canRenderApp('FAILED')).toBe(false);
  });
});

describe('the wait is bounded', () => {
  it('fonts that never resolve time out into DEGRADED rather than waiting forever', () => {
    expect(startupPhase(input())).toBe('WAITING');
    expect(startupPhase(input({ timedOut: true }))).toBe('DEGRADED');
    expect(splashShouldHide('DEGRADED')).toBe(true);
    // Degraded still renders the app -- system fonts are a reflow, not a failure.
    expect(canRenderApp('DEGRADED')).toBe(true);
  });

  it('a font error also proceeds instead of holding the splash', () => {
    expect(startupPhase(input({ fontError: true }))).toBe('DEGRADED');
  });

  it('the budget is finite and not absurd', () => {
    expect(STARTUP_TIMEOUT_MS).toBeGreaterThan(0);
    expect(STARTUP_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });
});

describe('exactly one phase may hold the splash', () => {
  it('WAITING holds it and nothing else does', () => {
    for (const phase of ALL_PHASES) {
      expect(`${phase}:${splashShouldHide(phase)}`).toBe(`${phase}:${phase !== 'WAITING'}`);
    }
  });

  it('every terminal phase lands on the app or on a visible error, never on nothing', () => {
    for (const phase of ALL_PHASES.filter((p) => p !== 'WAITING')) {
      const rendersApp = canRenderApp(phase);
      const rendersError = phase === 'FAILED';
      expect(`${phase}:${rendersApp || rendersError}`).toBe(`${phase}:true`);
    }
  });

  it('the happy path is unchanged', () => {
    expect(startupPhase(input({ fontsLoaded: true }))).toBe('READY');
    expect(canRenderApp('READY')).toBe(true);
    expect(splashShouldHide('READY')).toBe(true);
  });
});

describe('the root layout wires the gate to a finally-safe hide', () => {
  const LAYOUT = readFileSync(new URL('../../app/_layout.tsx', import.meta.url).pathname, 'utf8');

  it('hides through one idempotent, never-throwing path', () => {
    expect(LAYOUT).toContain('function hideSplashOnce()');
    expect(LAYOUT).toContain('SplashScreen.hideAsync().catch(() => undefined)');
    // Holding the splash must not be able to reject into nothing either.
    expect(LAYOUT).toContain('SplashScreen.preventAutoHideAsync().catch(() => undefined)');
  });

  it('drives the hide from the phase, not from the font flags directly', () => {
    expect(LAYOUT).toContain('if (splashShouldHide(phase)) hideSplashOnce();');
  });

  it('hides the splash from the error path too, which no effect below can reach', () => {
    const handler = LAYOUT.slice(LAYOUT.indexOf('const handleError'), LAYOUT.indexOf('const handleRetry'));
    expect(handler).toContain('hideSplashOnce()');
  });

  it('bounds the font wait with a timer', () => {
    expect(LAYOUT).toContain('setTimeout(() => setTimedOut(true), STARTUP_TIMEOUT_MS)');
  });

  it('no longer returns null while waiting, which is what made the splash permanent', () => {
    expect(LAYOUT).not.toContain('if (!fontsLoaded && !fontError) return null;');
  });

  it('wraps the provider tree in the boundary, not the other way round', () => {
    const boundaryAt = LAYOUT.indexOf('<StartupBoundary');
    const providerAt = LAYOUT.indexOf('<AuthProvider>');
    expect(boundaryAt).toBeGreaterThan(-1);
    expect(boundaryAt).toBeLessThan(providerAt);
  });

  it('offers a retry that genuinely remounts the tree', () => {
    expect(LAYOUT).toContain('setAttempt((n) => n + 1)');
    expect(LAYOUT).toContain('key={attempt}');
  });
});

describe('the session restore cannot hang the app either', () => {
  const AUTH = readFileSync(new URL('../auth-context.tsx', import.meta.url).pathname, 'utf8');

  it('catches a rejected session read instead of leaving loading true forever', () => {
    expect(AUTH).toContain('.catch(() => settle(null))');
  });

  it('gives a read that never settles a deadline', () => {
    expect(AUTH).toContain('SESSION_RESTORE_TIMEOUT_MS');
    expect(AUTH).toContain('setTimeout(() => settle(null), SESSION_RESTORE_TIMEOUT_MS)');
  });

  it('lands on signed-out rather than destroying stored credentials', () => {
    // Failing closed must show the sign-in screen; it must never sign anybody out for real.
    expect(AUTH).not.toMatch(/signOut\(\)\s*;?\s*\}\s*catch/);
    expect(AUTH).toContain('onAuthStateChange');
  });
});

describe('the error state speaks both languages', () => {
  it('carries every startup key in en and es', () => {
    for (const key of ['startup.errorTitle', 'startup.errorBody', 'startup.retry']) {
      expect(`${key}:en:${key in en}`).toBe(`${key}:en:true`);
      expect(`${key}:es:${key in es}`).toBe(`${key}:es:true`);
    }
  });

  it('reassures rather than alarms, and promises nothing about the file', () => {
    expect(String(en['startup.errorBody'])).toMatch(/nothing on your file has changed/i);
    expect(String(es['startup.errorBody'])).toMatch(/no ha cambiado nada/i);
  });

  it('renders its copy without needing the i18n provider that may have failed', () => {
    const BOUNDARY = readFileSync(new URL('../../components/ui/startup-boundary.tsx', import.meta.url).pathname, 'utf8');
    expect(BOUNDARY).toContain("from '@/lib/i18n/runtime'");
    // Imports only -- the word appears in the docstring explaining why it is NOT used.
    const imports = BOUNDARY.split('\n').filter((line) => line.trim().startsWith('import')).join('\n');
    expect(imports).not.toContain('useI18n');
    expect(imports).not.toContain('i18n/context');
  });
});
