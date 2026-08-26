import { describe, expect, it, vi } from 'vitest';

import {
  MAX_CHUNK_BYTES,
  checksum,
  createChunkedSecureStore,
  splitByUtf8,
  utf8Length,
  type SecureBackend,
} from '../secure-chunk-store';

/**
 * The session is a refresh token. These tests exist because the failure modes are all silent: a
 * half-written keychain, a chunk that never landed, a session reassembled one character short. None
 * of those throw -- they hand back a string that looks like a session and is not one.
 */

/** An in-memory keychain that can be inspected, corrupted and interrupted. */
function fakeBackend() {
  const store = new Map<string, string>();
  let failWritesAfter = Infinity;
  let writes = 0;
  const backend: SecureBackend = {
    async getItemAsync(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async setItemAsync(key, value) {
      writes += 1;
      if (writes > failWritesAfter) throw new Error('keychain unavailable');
      store.set(key, value);
    },
    async deleteItemAsync(key) {
      store.delete(key);
    },
  };
  return {
    backend,
    store,
    keys: () => [...store.keys()],
    interruptAfter(n: number) {
      failWritesAfter = n;
      writes = 0;
    },
  };
}

const SESSION_KEY = 'sb-zoey-auth-token';
/** Shaped like a session, with no real token in it. */
const bigAscii = JSON.stringify({
  access_token: `header.${'a'.repeat(2600)}.signature`,
  refresh_token: 'r'.repeat(320),
  user: { id: '00000000-0000-4000-8000-000000000000', email: 'sample@example.invalid' },
});
const bigUnicode = JSON.stringify({
  access_token: `header.${'á'.repeat(900)}${'𝄞'.repeat(220)}.signature`,
  refresh_token: 'ñ'.repeat(400),
  user: { name: 'José Ünicodé 𝄞' },
});

describe('UTF-8 measurement, not character counting', () => {
  it('counts bytes for one, two, three and four byte code points', () => {
    expect(utf8Length('a')).toBe(1);
    expect(utf8Length('ñ')).toBe(2);
    expect(utf8Length('€')).toBe(3);
    expect(utf8Length('𝄞')).toBe(4);
    /* `String.length` says 2 here -- the exact mistake this guards against. */
    expect('𝄞'.length).toBe(2);
  });

  it('never emits a chunk over the ceiling, in any script', () => {
    for (const value of [bigAscii, bigUnicode, 'é'.repeat(5000), '𝄞'.repeat(3000)]) {
      for (const part of splitByUtf8(value)) {
        expect(utf8Length(part)).toBeLessThanOrEqual(MAX_CHUNK_BYTES);
      }
    }
  });

  it('splits on code-point boundaries so the pieces rejoin exactly', () => {
    for (const value of [bigAscii, bigUnicode, '𝄞'.repeat(3000)]) {
      expect(splitByUtf8(value).join('')).toBe(value);
    }
  });
});

describe('round trip', () => {
  it('returns a small legacy-sized value unchanged', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, 'small');
    expect(await s.getItem(SESSION_KEY)).toBe('small');
  });

  it('returns a large ASCII session byte for byte', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigAscii);
    expect(await s.getItem(SESSION_KEY)).toBe(bigAscii);
  });

  it('returns a large Unicode session byte for byte', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigUnicode);
    expect(await s.getItem(SESSION_KEY)).toBe(bigUnicode);
  });

  it('keeps the canonical key small -- the session never sits in it', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigAscii);
    const manifest = f.store.get(SESSION_KEY) as string;
    expect(utf8Length(manifest)).toBeLessThan(300);
    expect(manifest).not.toContain('access_token');
  });

  it('holds every stored item under the warning threshold', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigUnicode);
    for (const [, value] of f.store) expect(utf8Length(value)).toBeLessThanOrEqual(MAX_CHUNK_BYTES);
  });
});

describe('it fails closed rather than returning a fragment', () => {
  it('returns null when a chunk is missing', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigAscii);
    const chunk = f.keys().find((k) => k.includes('__zc1') && k.endsWith('.1'))!;
    f.store.delete(chunk);
    expect(await s.getItem(SESSION_KEY)).toBeNull();
  });

  it('returns null when a chunk is corrupted', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigAscii);
    const chunk = f.keys().find((k) => k.includes('__zc1') && k.endsWith('.0'))!;
    f.store.set(chunk, `${(f.store.get(chunk) as string).slice(0, -1)}X`);
    expect(await s.getItem(SESSION_KEY)).toBeNull();
  });

  it('returns null when a chunk is truncated even if the checksum were skipped', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigAscii);
    const chunk = f.keys().find((k) => k.includes('__zc1') && k.endsWith('.0'))!;
    f.store.set(chunk, (f.store.get(chunk) as string).slice(0, 40));
    expect(await s.getItem(SESSION_KEY)).toBeNull();
  });

  it('returns null on a manifest whose chunks were never written', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigAscii);
    for (const k of f.keys()) if (k.includes('__zc1')) f.store.delete(k);
    expect(await s.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('an interrupted write cannot destroy the session that is already there', () => {
  it('leaves the previous value readable when chunk writing fails', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigAscii);
    expect(await s.getItem(SESSION_KEY)).toBe(bigAscii);

    /* Die partway through the replacement, before the manifest is swapped. */
    f.interruptAfter(1);
    await expect(s.setItem(SESSION_KEY, bigUnicode)).rejects.toThrow();

    expect(await s.getItem(SESSION_KEY)).toBe(bigAscii);
  });
});

describe('replacing a generation', () => {
  it('reads back the new value and retires the old chunks', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigAscii);
    const firstGen = f.keys().filter((k) => k.includes('__zc1'));

    await s.setItem(SESSION_KEY, bigUnicode);
    expect(await s.getItem(SESSION_KEY)).toBe(bigUnicode);

    for (const k of firstGen) expect(f.store.has(k), `stale chunk ${k}`).toBe(false);
  });

  it('does not mix chunks when two writes overlap', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, 'seed');

    const a = 'A'.repeat(6000);
    const b = 'B'.repeat(6000);
    await Promise.all([s.setItem(SESSION_KEY, a), s.setItem(SESSION_KEY, b)]);

    const read = await s.getItem(SESSION_KEY);
    /* Whichever won, the value must be ONE of them entire -- never a splice of both. */
    expect(read === a || read === b, 'reassembled a mixture of two generations').toBe(true);
  });
});

describe('removal', () => {
  it('clears the manifest and every chunk it referenced', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    await s.setItem(SESSION_KEY, bigAscii);
    await s.removeItem(SESSION_KEY);
    expect(await s.getItem(SESSION_KEY)).toBeNull();
    expect(f.keys().filter((k) => k.startsWith(SESSION_KEY))).toEqual([]);
  });

  it('clears a legacy unchunked value too', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    f.store.set(SESSION_KEY, bigAscii);
    await s.removeItem(SESSION_KEY);
    expect(await s.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('legacy migration', () => {
  it('reads a pre-existing unchunked session written by the old adapter', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    f.store.set(SESSION_KEY, bigAscii);
    expect(await s.getItem(SESSION_KEY)).toBe(bigAscii);
  });

  it('migrates it to chunks on the next write, leaving nothing oversized', async () => {
    const f = fakeBackend();
    const s = createChunkedSecureStore(f.backend);
    f.store.set(SESSION_KEY, bigAscii);

    await s.setItem(SESSION_KEY, bigUnicode);

    expect(await s.getItem(SESSION_KEY)).toBe(bigUnicode);
    for (const [, value] of f.store) expect(utf8Length(value)).toBeLessThanOrEqual(MAX_CHUNK_BYTES);
  });
});

describe('nothing secret is ever printed', () => {
  it('writes, reads and removes without touching the console', async () => {
    const spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined)
    );
    try {
      const f = fakeBackend();
      const s = createChunkedSecureStore(f.backend);
      await s.setItem(SESSION_KEY, bigUnicode);
      await s.getItem(SESSION_KEY);
      const chunk = f.keys().find((k) => k.includes('__zc1'))!;
      f.store.set(chunk, 'corrupted');
      await s.getItem(SESSION_KEY);
      await s.removeItem(SESSION_KEY);
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
  });

  it('has no logging statements in the module at all', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, '..', 'secure-chunk-store.ts'), 'utf8');
    expect(src).not.toMatch(/console\.(log|warn|error|info|debug)/);
  });
});

describe('the checksum actually discriminates', () => {
  it('changes when the value changes by one character', () => {
    expect(checksum('session-a')).not.toBe(checksum('session-b'));
    expect(checksum(bigAscii)).not.toBe(checksum(`${bigAscii} `));
  });

  it('is stable for the same input', () => {
    expect(checksum(bigUnicode)).toBe(checksum(bigUnicode));
  });
});
