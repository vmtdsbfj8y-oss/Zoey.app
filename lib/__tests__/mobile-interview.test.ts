import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The transport for the identity review.
 *
 * What matters here is not that a happy request works. It is that every way the engine can decline
 * — an expired session, a version this build cannot read, a stale pending id — comes back as a
 * distinguishable, actionable result instead of an empty screen or a silent success.
 */

const state = {
  baseUrl: 'https://engine.example' as string | null,
  response: null as { ok: boolean; body: unknown } | null,
  throws: null as Error | null,
  /** When true the transport never settles -- the stall a hung network actually produces. */
  hangs: false,
  lastUrl: '' as string,
  lastInit: undefined as RequestInit | undefined,
  lastTimeoutMs: undefined as number | undefined,
};

vi.mock('@/lib/api-config', () => ({
  requireEngineBaseUrl: () => {
    if (!state.baseUrl) throw new Error('The engine URL is not configured.');
    return state.baseUrl;
  },
}));

vi.mock('@/lib/auth-fetch', () => ({
  authenticatedFetch: async (url: string, init?: RequestInit, options?: { timeoutMs?: number }) => {
    state.lastUrl = url;
    state.lastInit = init;
    state.lastTimeoutMs = options?.timeoutMs;
    if (state.hangs) return new Promise<Response>(() => {});
    if (state.throws) throw state.throws;
    const res = state.response!;
    return { ok: res.ok, json: async () => res.body } as unknown as Response;
  },
}));

const { getInterview, submitInterview, needsRefetch, INTERVIEW_VIEW_VERSION } = await import('../mobile-interview');
const { DEFAULT_REQUEST_TIMEOUT_MS } = await import('../with-timeout');

const view = {
  version: 'mobile-interview-v1',
  state: 'OPEN',
  sessionId: 's1',
  items: [],
  pendingQuestion: null,
  pendingSelection: null,
  pendingSummary: null,
  assistantText: null,
  evidenceNeeds: [],
  locale: 'en',
};

beforeEach(() => {
  state.baseUrl = 'https://engine.example';
  state.response = null;
  state.throws = null;
  state.lastUrl = '';
  state.lastInit = undefined;
  state.lastTimeoutMs = undefined;
  state.hangs = false;
});

describe('loading the review', () => {
  it('reads a well-formed view from the engine', async () => {
    state.response = { ok: true, body: { ok: true, view } };
    const result = await getInterview();
    expect(result.status).toBe('READY');
    expect(state.lastUrl).toBe('https://engine.example/api/mobile/interview');
  });

  it('refuses a payload whose version this build does not know', async () => {
    state.response = { ok: true, body: { ok: true, view: { ...view, version: 'mobile-interview-v2' } } };
    const result = await getInterview();
    expect(result.status).toBe('UNAVAILABLE');
    // A partially understood screen is worse than an honest refusal.
    if (result.status === 'UNAVAILABLE') expect(result.sessionExpired).toBe(false);
  });

  it('refuses a body with no view at all', async () => {
    state.response = { ok: true, body: { ok: true } };
    expect((await getInterview()).status).toBe('UNAVAILABLE');
  });

  it('reports an expired session distinctly, so the screen can offer sign-in', async () => {
    state.throws = new Error('Your session has expired. Please sign in again.');
    const result = await getInterview();
    expect(result.status).toBe('UNAVAILABLE');
    if (result.status === 'UNAVAILABLE') {
      expect(result.sessionExpired).toBe(true);
      expect(result.message).toMatch(/session/i);
    }
  });

  it('does not mistake an unreachable engine for an expired session', async () => {
    state.throws = new Error('Network request failed');
    const result = await getInterview();
    if (result.status === 'UNAVAILABLE') expect(result.sessionExpired).toBe(false);
  });

  it('surfaces a missing engine URL rather than calling anything', async () => {
    state.baseUrl = null;
    const result = await getInterview();
    expect(result.status).toBe('UNAVAILABLE');
    expect(state.lastUrl).toBe('');
  });

  it('never reports a failure as an empty review', async () => {
    state.response = { ok: false, body: {} };
    const result = await getInterview();
    expect(result.status).toBe('UNAVAILABLE');
    expect(result.status).not.toBe('READY');
  });
});

describe('submitting an action', () => {
  it('posts the action verbatim and returns the next view', async () => {
    state.response = { ok: true, body: { ok: true, view } };
    const result = await submitInterview({ action: 'ANSWER', questionId: 'q1', value: 'NO' });
    expect(result.ok).toBe(true);
    expect(state.lastInit?.method).toBe('POST');
    expect(JSON.parse(String(state.lastInit?.body))).toEqual({ action: 'ANSWER', questionId: 'q1', value: 'NO' });
  });

  it('sends no client or owner id of its own', async () => {
    state.response = { ok: true, body: { ok: true, view } };
    await submitInterview({ action: 'START' });
    const body = JSON.parse(String(state.lastInit?.body));
    for (const forbidden of ['clientId', 'ownerId', 'subject', 'userId']) {
      expect(`${forbidden}:${forbidden in body}`).toBe(`${forbidden}:false`);
    }
  });

  it('prefers the engine’s own sentence when it refuses', async () => {
    state.response = { ok: false, body: { ok: false, reasonCode: 'STALE_REQUEST', error: 'That question was already answered.' } };
    const result = await submitInterview({ action: 'ANSWER', questionId: 'old', value: 'YES' });
    expect(result).toMatchObject({ ok: false, reasonCode: 'STALE_REQUEST', message: 'That question was already answered.' });
  });

  it('treats a 200 that is not ok:true as a refusal', async () => {
    state.response = { ok: true, body: { ok: false, reasonCode: 'SESSION_STATE' } };
    const result = await submitInterview({ action: 'CANCEL' });
    expect(result.ok).toBe(false);
  });

  it('reports an expired session distinctly on submit too', async () => {
    state.throws = new Error('Your session has expired. Please sign in again.');
    const result = await submitInterview({ action: 'START' });
    expect(result).toMatchObject({ ok: false, sessionExpired: true });
  });
});

describe('which refusals mean the screen is stale', () => {
  const refusal = (reasonCode: string) =>
    ({ ok: false as const, message: 'x', reasonCode: reasonCode as never, sessionExpired: false });

  it('refetches when the server says the form no longer matches', () => {
    for (const code of ['STALE_REQUEST', 'SESSION_STATE', 'NOT_FOUND', 'UNKNOWN_QUESTION']) {
      expect(`${code}:${needsRefetch(refusal(code))}`).toBe(`${code}:true`);
    }
  });

  it('does not refetch on failures a retry could fix', () => {
    for (const code of ['RATE_LIMITED', 'EXECUTION_FAILED', 'MESSAGE_TOO_LONG', 'UNAVAILABLE']) {
      expect(`${code}:${needsRefetch(refusal(code))}`).toBe(`${code}:false`);
    }
    expect(needsRefetch({ ok: true, view: view as never })).toBe(false);
  });
});

describe('the version string is pinned', () => {
  it('matches the engine seam this build was written against', () => {
    expect(INTERVIEW_VIEW_VERSION).toBe('mobile-interview-v1');
  });
});

describe('a request that never settles still ends', () => {
  /*
   * The screen sets `inFlight` before awaiting submitInterview and clears it after. Before this was
   * bounded, a stalled request left that ref true for the life of the modal: every later tap
   * ignored, no error shown, nothing to retry. `getInterview` had the matching failure -- the
   * LOADING pane with no way out. fetch has no timeout of its own, so neither did they.
   */
  it('gives up on a hung read and offers a retryable failure', async () => {
    vi.useFakeTimers();
    try {
      state.hangs = true;
      const pending = getInterview();
      await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS + 50);
      const result = await pending;
      expect(result.status).toBe('UNAVAILABLE');
      // Not reported as an expired session: nothing said the credentials were rejected.
      expect(result.status === 'UNAVAILABLE' && result.sessionExpired).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives up on a hung submit, so the in-flight guard is always released', async () => {
    vi.useFakeTimers();
    try {
      state.hangs = true;
      const pending = submitInterview({ kind: 'START' } as never);
      await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS + 50);
      const result = await pending;
      expect(result.ok).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('also hands the transport its own deadline, so the socket is released', async () => {
    state.response = { ok: true, body: { view } };
    await getInterview();
    expect(state.lastTimeoutMs).toBe(DEFAULT_REQUEST_TIMEOUT_MS);
  });
});
