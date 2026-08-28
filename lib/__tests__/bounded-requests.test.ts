import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Nothing the consumer waits on is allowed to wait forever.
 *
 * This is the fourth time the same shape has bitten: the launch screen held on a keychain read, the
 * Settings screen held on a profile fetch, the identity review held on its own two calls, and the
 * Documents screen held on the overview. `fetch` has no timeout of its own and an unreachable host
 * stalls rather than failing, so "it worked on my machine" and "it hangs on a captive portal" are
 * the same code.
 *
 * The transport is mocked to never settle -- the stall a dead network actually produces, which is
 * not the same thing as an error and is not covered by any try/catch.
 */

const state = {
  hangs: false,
  lastTimeoutMs: undefined as number | undefined,
  response: null as { ok: boolean; status: number; body: unknown } | null,
};

vi.mock('@/lib/api-config', () => ({
  requireEngineBaseUrl: () => 'https://engine.example',
}));

vi.mock('@/lib/auth-fetch', () => ({
  authenticatedFetch: async (_url: string, _init?: RequestInit, options?: { timeoutMs?: number }) => {
    state.lastTimeoutMs = options?.timeoutMs;
    if (state.hangs) return new Promise<Response>(() => {});
    const res = state.response!;
    return { ok: res.ok, status: res.status, json: async () => res.body } as unknown as Response;
  },
}));

const { getMobileOverview } = await import('../mobile-api');
const { DEFAULT_REQUEST_TIMEOUT_MS } = await import('../with-timeout');

beforeEach(() => {
  state.hangs = false;
  state.lastTimeoutMs = undefined;
  state.response = null;
});

describe('the overview the Documents screen waits on', () => {
  it('hands the transport a deadline, so a stalled request is aborted rather than abandoned', async () => {
    state.response = { ok: true, status: 200, body: { version: 'mobile-overview-v1' } };
    await getMobileOverview();
    expect(state.lastTimeoutMs).toBe(DEFAULT_REQUEST_TIMEOUT_MS);
  });

  it('reports a reachable failure rather than resolving into a screen that never arrives', async () => {
    /*
     * `loading` in the documents store is held until this settles. Before the deadline existed a
     * stalled overview meant the Documents tab -- and Run Zoey with it -- simply never appeared.
     */
    state.response = { ok: false, status: 503, body: {} };
    const result = await getMobileOverview();
    expect(result.state).not.toBe('LINKED');
  });

  it('never reports a transport problem as an empty but valid overview', async () => {
    state.response = { ok: false, status: 500, body: {} };
    const result = await getMobileOverview();
    expect(result.state === 'LINKED').toBe(false);
  });
});

describe('the words those failures use', () => {
  it('carries no English literal of its own', async () => {
    const { readFileSync } = await import('node:fs');
    const SRC = readFileSync(new URL('../mobile-api.ts', import.meta.url).pathname, 'utf8');
    /*
     * Every message this module produces is either the engine's own sentence or a resource key.
     * It used to mix the two, so a Spanish reader on a bad connection got "Can't reach Zoey."
     */
    for (const literal of [
      "Can't reach Zoey",
      'Zoey sent something this app could not read',
      'Zoey sent an unexpected response',
      'That code could not be used',
    ]) {
      expect(`${literal}:${SRC.includes(literal)}`).toBe(`${literal}:false`);
    }
    expect(SRC).toContain("tr('error.offline')");
    expect(SRC).toContain("tr('lib.unreadableResponse')");
    expect(SRC).toContain("tr('lib.codeUnusable')");
  });

  it('resolves those keys in both languages', async () => {
    const { en } = await import('../i18n/en');
    const { es } = await import('../i18n/es');
    for (const key of ['error.offline', 'lib.unreadableResponse', 'lib.codeUnusable']) {
      expect(`${key}:en:${key in en}`).toBe(`${key}:en:true`);
      expect(`${key}:es:${key in es}`).toBe(`${key}:es:true`);
    }
  });
});
