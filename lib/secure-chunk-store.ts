/**
 * A SecureStore adapter that survives a session larger than one keychain item.
 *
 * ==============================  THE WARNING THIS EXISTS FOR  ==============================
 *
 * `expo-secure-store` warns above 2048 bytes and says a future SDK "may throw". A Supabase session
 * is an access JWT, a refresh token and a user object -- comfortably 2.5-4 KB -- so every sign-in
 * and every token refresh logged:
 *
 *   Value being stored in SecureStore is larger than 2048 bytes and it may not be stored
 *   successfully. In a future SDK version, this call may throw an error.
 *
 * The tempting fix is to move the session to AsyncStorage, which has no size limit. That would put
 * a refresh token in plaintext on the device, so it is not on the table. Instead the value is split
 * across several keychain items, each comfortably under the threshold, and reassembled on read.
 *
 * ==============================  WHY A MANIFEST, AND WHY IT IS WRITTEN LAST  ==============================
 *
 * The canonical key holds a small manifest, never the session. Chunks live under keys derived from a
 * per-write id. The order is deliberate: every chunk is written FIRST, and only once they have all
 * landed is the manifest swapped. A process killed mid-write leaves orphan chunks and an untouched
 * manifest -- the old session still reads correctly. There is no window where the manifest points at
 * chunks that do not exist yet.
 *
 * The per-write id is what makes concurrent refreshes safe. Two writes in flight allocate different
 * ids, so neither can read the other's chunks; the manifest swap picks a winner, and only the winner
 * deletes the generation it replaced.
 *
 * ==============================  IT FAILS CLOSED  ==============================
 *
 * A missing chunk, a short read, a byte-length mismatch or a checksum mismatch all return null.
 * Never a partial string. A truncated session is worse than no session: Supabase would treat the
 * fragment as a corrupt token and the failure would surface somewhere far from here.
 *
 * ==============================  NOTHING HERE MAY BE LOGGED  ==============================
 *
 * No function in this file prints a value, a chunk, a manifest or a key's contents. The strings
 * passing through are the session itself.
 */

/** The subset of `expo-secure-store` this needs. Injected so the behaviour is testable. */
export interface SecureBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: Record<string, unknown>): Promise<void>;
  deleteItemAsync(key: string, options?: Record<string, unknown>): Promise<void>;
}

/**
 * 1800, not 2048. The ceiling is the point the SDK starts warning; sitting just under it leaves no
 * room for the keychain's own per-item overhead, and the whole purpose is to never reach it.
 */
export const MAX_CHUNK_BYTES = 1800;

/** Bumped only if the on-device layout changes in a way an older build could misread. */
const SCHEMA = 1;

const MANIFEST_TAG = 'zoey.chunked.v1';
/** Chunk keys are derived, never guessed: `<name>.__zc1.<writeId>.<index>`. */
const chunkKey = (name: string, writeId: string, index: number) => `${name}.__zc1.${writeId}.${index}`;

interface Manifest {
  tag: typeof MANIFEST_TAG;
  schema: number;
  /** Identifies the generation. Chunk keys are derived from it. */
  id: string;
  /** How many chunks make up the value. */
  count: number;
  /** UTF-8 byte length of the ORIGINAL string, checked after reassembly. */
  bytes: number;
  /** Integrity check over the original string. Detects corruption, not tampering. */
  sum: string;
}

/**
 * UTF-8 byte length, computed from code points.
 *
 * `String.length` counts UTF-16 units, so it under-counts anything above U+07FF and mis-counts
 * astral characters entirely. A session carrying a name with an accent would have been chunked
 * against the wrong number and could still have exceeded the limit.
 */
export function utf8Length(value: string): number {
  let bytes = 0;
  for (const ch of value) {
    const cp = ch.codePointAt(0) as number;
    bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/**
 * FNV-1a over UTF-16 code units.
 *
 * An integrity check, deliberately not a MAC: it exists to catch a truncated or half-written
 * keychain item, and anything able to rewrite the keychain could rewrite a MAC alongside it.
 */
export function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Split on code-point boundaries so each piece stays under the byte ceiling.
 *
 * Splitting the encoded bytes would be simpler and wrong: a multi-byte character cut across two
 * keychain items cannot be reassembled, and a surrogate pair cut in half is not even valid UTF-16.
 */
export function splitByUtf8(value: string, max: number = MAX_CHUNK_BYTES): string[] {
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const ch of value) {
    const cp = ch.codePointAt(0) as number;
    const size = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (currentBytes + size > max && current !== '') {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += ch;
    currentBytes += size;
  }
  if (current !== '') parts.push(current);
  return parts;
}

function parseManifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  /* A legacy session is raw JSON; only our own envelope carries the tag. */
  if (raw.indexOf(MANIFEST_TAG) === -1) return null;
  try {
    const parsed = JSON.parse(raw) as Manifest;
    if (parsed?.tag !== MANIFEST_TAG || parsed.schema !== SCHEMA) return null;
    if (!Number.isInteger(parsed.count) || parsed.count < 1) return null;
    if (!Number.isInteger(parsed.bytes) || parsed.bytes < 0) return null;
    if (typeof parsed.id !== 'string' || parsed.id.length === 0) return null;
    if (typeof parsed.sum !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

let writeCounter = 0;
function nextWriteId(): string {
  writeCounter = (writeCounter + 1) % 0xffff;
  const rand = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${Date.now().toString(36)}${writeCounter.toString(36)}${rand}`;
}

export interface ChunkedStore {
  getItem(name: string): Promise<string | null>;
  setItem(name: string, value: string): Promise<void>;
  removeItem(name: string): Promise<void>;
}

export function createChunkedSecureStore(
  backend: SecureBackend,
  options: { setOptions?: Record<string, unknown>; maxChunkBytes?: number } = {}
): ChunkedStore {
  const max = options.maxChunkBytes ?? MAX_CHUNK_BYTES;
  const setOpts = options.setOptions;

  /** Best-effort sweep of a generation's chunks. Never throws: cleanup must not fail a write. */
  async function dropChunks(name: string, writeId: string, count: number): Promise<void> {
    for (let i = 0; i < count; i += 1) {
      try {
        await backend.deleteItemAsync(chunkKey(name, writeId, i));
      } catch {
        /* An orphan chunk is inert: nothing reads it without a manifest pointing at it. */
      }
    }
  }

  return {
    async getItem(name) {
      const raw = await backend.getItemAsync(name);
      const manifest = parseManifest(raw);
      /* Legacy, unchunked, or simply absent -- hand it back untouched. */
      if (!manifest) return raw;

      let assembled = '';
      for (let i = 0; i < manifest.count; i += 1) {
        const part = await backend.getItemAsync(chunkKey(name, manifest.id, i));
        /* Fail closed. A partial session is worse than none: see the header. */
        if (part === null) return null;
        assembled += part;
      }
      if (utf8Length(assembled) !== manifest.bytes) return null;
      if (checksum(assembled) !== manifest.sum) return null;
      return assembled;
    },

    async setItem(name, value) {
      const previous = parseManifest(await backend.getItemAsync(name));
      const parts = splitByUtf8(value, max);
      const writeId = nextWriteId();

      /* Every chunk lands before the manifest moves. An interrupted write leaves the old session
         readable and these chunks orphaned. */
      for (let i = 0; i < parts.length; i += 1) {
        await backend.setItemAsync(chunkKey(name, writeId, i), parts[i], setOpts);
      }

      const manifest: Manifest = {
        tag: MANIFEST_TAG,
        schema: SCHEMA,
        id: writeId,
        count: parts.length,
        bytes: utf8Length(value),
        sum: checksum(value),
      };
      await backend.setItemAsync(name, JSON.stringify(manifest), setOpts);

      /*
       * Only the write that actually won the manifest may retire the generation it replaced. Under
       * concurrent refreshes the loser would otherwise delete the winner's chunks.
       */
      if (previous && previous.id !== writeId) {
        const committed = parseManifest(await backend.getItemAsync(name));
        if (committed?.id === writeId) await dropChunks(name, previous.id, previous.count);
      }
    },

    async removeItem(name) {
      const manifest = parseManifest(await backend.getItemAsync(name));
      if (manifest) await dropChunks(name, manifest.id, manifest.count);
      await backend.deleteItemAsync(name);
    },
  };
}
