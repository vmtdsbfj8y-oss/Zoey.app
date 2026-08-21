import { createClient } from 'redis';

/**
 * Persistence for received documents, analysis jobs, profiles, goals, scores
 * and membership.
 *
 * ## One set of commands, three ways to send them
 *
 * Every backend below executes the SAME Redis command arrays against the SAME
 * key names. That is deliberate: the storage layer is chosen by configuration,
 * but what gets written -- key naming, JSON shapes, the TTL on job keys, the
 * explicit DEL list in `purge` -- is identical, so moving between backends does
 * not migrate or reinterpret anything already stored.
 *
 *   - `KV_REST_API_URL` + `KV_REST_API_TOKEN`: Upstash's REST endpoint, spoken
 *     over plain fetch. Kept because it is already configured elsewhere.
 *
 *   - `REDIS_URL`: a Marketplace Redis, over a real connection. This is what a
 *     Vercel-attached Redis injects, and it is the only credential involved --
 *     it is read once here and never logged, echoed or returned by any route.
 *
 *   - An in-process Map, for local development and tests ONLY.
 *
 * ## Why the Map is not allowed to run deployed
 *
 * On serverless it holds only for the life of a warm instance, so a membership
 * granted on one instance vanishes on the next cold start -- and does so
 * silently, having reported success. A deployed environment with no persistence
 * configured therefore raises instead of quietly degrading: losing a paid
 * entitlement without an error is worse than refusing to serve the request.
 */

export type StoredDoc = {
  docId: string;
  /** Which intake slot this fills, e.g. "proof-address". */
  slotId: string;
  filename?: string;
  receivedAt: number;
};

export type StoredJob = {
  jobId: string;
  documentIds: string[];
  startedAt: number;
  /** Set to fail a job explicitly; otherwise status is derived from elapsed time. */
  failed?: { reason: string };
};

/**
 * Non-sensitive account fields only.
 *
 * There is deliberately no SSN, date of birth, password, token or full identity
 * data here. Those belong behind authentication and encryption that this
 * project does not yet have, and the More screen has no need to display them.
 */
export type StoredProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /** City/state only -- never a full street address. */
  city?: string;
  state?: string;
  notifications?: {
    disputeUpdates?: boolean;
    documentRequests?: boolean;
    scoreChanges?: boolean;
    productNews?: boolean;
  };
  /*
   * What this account accepted, and which wording it was.
   *
   * The version is the load-bearing field. A timestamp alone answers "when did they agree" but not
   * "to what" -- and once the Terms have been revised twice, that is the only question anybody
   * actually asks. Append-only in practice: a new acceptance is added rather than overwriting the
   * old one, so the history of what this person agreed to over time stays readable.
   */
  legalAcceptance?: { documentId: string; version: string; acceptedAt: number }[];
  updatedAt?: number;
};

export type GoalKind =
  | 'target-score'
  | 'vehicle'
  | 'home'
  | 'business-funding'
  | 'utilization'
  | 'negative-items'
  | 'positive-history'
  | 'custom';

export type StoredGoal = {
  goalId: string;
  kind: GoalKind;
  title: string;
  /** What the client is working toward. Null when the goal is not numeric. */
  targetValue?: number | null;
  unit?: 'score' | 'percent' | 'items' | null;
  note?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
  updatedAt: number;
};

/**
 * A score as extracted from an analyzed report. `capturedAt` plus one row per
 * reading is what makes history possible as clients upload newer reports --
 * nothing here overwrites a previous reading.
 */
export type StoredScore = {
  scoreId: string;
  bureau: 'TransUnion' | 'Experian' | 'Equifax';
  score: number;
  /** e.g. "FICO 8", "VantageScore 3.0". Never inferred. */
  model?: string;
  /** Which document/report it came from. */
  sourceDocId?: string;
  capturedAt: number;
};

/**
 * The membership record. THE SERVER IS THE ONLY WRITER.
 *
 * There is deliberately no HTTP route that writes this -- see
 * `api/_lib/membership.ts`. A client can read its own status and nothing else,
 * so "mark myself active" is not an operation the API exposes at all.
 */
export type StoredMembership = {
  status: 'free' | 'active';
  /** epoch ms. When set and in the past the record resolves to free. */
  activeUntil?: number | null;
  /** What granted it, e.g. a payment provider. Never supplied by a client. */
  source?: string;
  /** epoch ms of the first grant. Kept across renewals. */
  startedAt?: number | null;
  /** Billing provider, e.g. 'apple'. null until real billing is connected. */
  provider?: string | null;
  updatedAt: number;
};

/** Directory row, so the owner portal can list clients without a service key. */
export type StoredUserRef = { userId: string; email?: string; firstSeen: number; lastSeen: number };

export type Store = {
  putDoc(doc: StoredDoc): Promise<void>;
  listDocs(): Promise<StoredDoc[]>;
  putJob(job: StoredJob): Promise<void>;
  getJob(jobId: string): Promise<StoredJob | null>;

  getProfile(): Promise<StoredProfile | null>;
  putProfile(profile: StoredProfile): Promise<void>;

  listGoals(): Promise<StoredGoal[]>;
  putGoal(goal: StoredGoal): Promise<void>;
  getGoal(goalId: string): Promise<StoredGoal | null>;
  deleteGoal(goalId: string): Promise<void>;

  /** Ordered oldest -> newest. Empty until the analyzer extracts real scores. */
  listScores(): Promise<StoredScore[]>;
  putScore(score: StoredScore): Promise<void>;

  /** null when the user has never had a membership record -> resolves to free. */
  getMembership(): Promise<StoredMembership | null>;
  putMembership(membership: StoredMembership): Promise<void>;

  /**
   * Erases every record this store holds for its one user.
   *
   * Scoped by construction: a Store instance is bound to a single user id at
   * creation and every key it touches is built from that id, so there is no
   * argument here that could be pointed at somebody else's data.
   *
   * Returns what it removed, by NAME not by content, so the deletion endpoint
   * can report what happened without reading any of it back.
   */
  purge(): Promise<string[]>;
};

function createMemoryStore(): Store {
  const docs = new Map<string, StoredDoc>();
  const jobs = new Map<string, StoredJob>();
  const goals = new Map<string, StoredGoal>();
  const scores = new Map<string, StoredScore>();
  let profile: StoredProfile | null = null;
  let membership: StoredMembership | null = null;

  return {
    async putDoc(doc) {
      // Keyed by slot, so re-uploading a slot replaces it rather than
      // accumulating duplicates that would satisfy the required-set check twice.
      docs.set(doc.slotId, doc);
    },
    async listDocs() {
      return [...docs.values()];
    },
    async putJob(job) {
      jobs.set(job.jobId, job);
    },
    async getJob(jobId) {
      return jobs.get(jobId) ?? null;
    },
    async getProfile() {
      return profile;
    },
    async putProfile(next) {
      profile = next;
    },
    async listGoals() {
      return [...goals.values()].sort((a, b) => a.createdAt - b.createdAt);
    },
    async putGoal(goal) {
      goals.set(goal.goalId, goal);
    },
    async getGoal(goalId) {
      return goals.get(goalId) ?? null;
    },
    async deleteGoal(goalId) {
      goals.delete(goalId);
    },
    async listScores() {
      return [...scores.values()].sort((a, b) => a.capturedAt - b.capturedAt);
    },
    async putScore(score) {
      scores.set(score.scoreId, score);
    },
    async getMembership() {
      return membership;
    },
    async putMembership(next) {
      membership = next;
    },
    async purge() {
      const removed: string[] = [];
      if (docs.size) removed.push('documents');
      if (jobs.size) removed.push('jobs');
      if (goals.size) removed.push('goals');
      if (scores.size) removed.push('scores');
      if (profile) removed.push('profile');
      if (membership) removed.push('membership');
      docs.clear();
      jobs.clear();
      goals.clear();
      scores.clear();
      profile = null;
      membership = null;
      return removed;
    },
  };
}

/**
 * Sends one Redis command and resolves its reply.
 *
 * The whole storage layer is expressed in terms of this, so a backend is ~10
 * lines and cannot drift from the others in what it actually writes.
 */
type CommandExecutor = (command: unknown[]) => Promise<unknown>;

function createCommandStore(call: CommandExecutor, userId: string): Store {
  const prefix = `zoey:user:${userId}`;
  const DOCS_KEY = `${prefix}:docs`;
  const PROFILE_KEY = `${prefix}:profile`;
  const GOALS_KEY = `${prefix}:goals`;
  const SCORES_KEY = `${prefix}:scores`;
  const MEMBERSHIP_KEY = `${prefix}:membership`;
  const jobKey = (id: string) => `${prefix}:job:${id}`;

  return {
    async putDoc(doc) {
      await call(['HSET', DOCS_KEY, doc.slotId, JSON.stringify(doc)]);
    },
    async listDocs() {
      const result = (await call(['HVALS', DOCS_KEY])) as string[] | null;
      return (result ?? []).map((v) => JSON.parse(v) as StoredDoc);
    },
    async putJob(job) {
      // Expire after a day -- jobs are transient and nothing reads them later.
      await call(['SET', jobKey(job.jobId), JSON.stringify(job), 'EX', 86400]);
    },
    async getJob(jobId) {
      const result = (await call(['GET', jobKey(jobId)])) as string | null;
      return result ? (JSON.parse(result) as StoredJob) : null;
    },
    async getProfile() {
      const result = (await call(['GET', PROFILE_KEY])) as string | null;
      return result ? (JSON.parse(result) as StoredProfile) : null;
    },
    async putProfile(profile) {
      await call(['SET', PROFILE_KEY, JSON.stringify(profile)]);
    },
    async listGoals() {
      const result = (await call(['HVALS', GOALS_KEY])) as string[] | null;
      return (result ?? [])
        .map((v) => JSON.parse(v) as StoredGoal)
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async putGoal(goal) {
      await call(['HSET', GOALS_KEY, goal.goalId, JSON.stringify(goal)]);
    },
    async getGoal(goalId) {
      const result = (await call(['HGET', GOALS_KEY, goalId])) as string | null;
      return result ? (JSON.parse(result) as StoredGoal) : null;
    },
    async deleteGoal(goalId) {
      await call(['HDEL', GOALS_KEY, goalId]);
    },
    async listScores() {
      const result = (await call(['HVALS', SCORES_KEY])) as string[] | null;
      return (result ?? [])
        .map((v) => JSON.parse(v) as StoredScore)
        .sort((a, b) => a.capturedAt - b.capturedAt);
    },
    async putScore(score) {
      await call(['HSET', SCORES_KEY, score.scoreId, JSON.stringify(score)]);
    },
    async getMembership() {
      const result = (await call(['GET', MEMBERSHIP_KEY])) as string | null;
      return result ? (JSON.parse(result) as StoredMembership) : null;
    },
    async putMembership(membership) {
      // No TTL: membership must not silently lapse because a key expired.
      await call(['SET', MEMBERSHIP_KEY, JSON.stringify(membership)]);
    },
    async purge() {
      /*
       * Every key this store can write, deleted by exact name.
       *
       * Deliberately NOT a `SCAN`/`KEYS` sweep over `${prefix}:*`. A pattern
       * scan is one typo away from matching a neighbouring namespace, and the
       * blast radius of that mistake is another client's entire account. An
       * explicit list can only ever delete too little, which is recoverable and
       * visible; a wrong glob is neither.
       *
       * Job keys are the one thing not listed, because they cannot be: their
       * names carry a random job id. They are written with `EX 86400` and are
       * transient by design, so they expire on their own within a day and hold
       * no profile, score or document content in the meantime.
       */
      const named: Array<[string, string]> = [
        ['documents', DOCS_KEY],
        ['profile', PROFILE_KEY],
        ['goals', GOALS_KEY],
        ['scores', SCORES_KEY],
        ['membership', MEMBERSHIP_KEY],
      ];
      const removed: string[] = [];
      for (const [label, key] of named) {
        // DEL returns how many keys it actually removed, so this reports what
        // was there rather than what we asked for.
        const count = (await call(['DEL', key])) as number | null;
        if (typeof count === 'number' && count > 0) removed.push(label);
      }
      return removed;
    },
  };
}

/* -------------------------------------------------------------------------- *
 * Backend selection
 * -------------------------------------------------------------------------- */

const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;
const redisUrl = process.env.REDIS_URL;

/** Upstash's REST endpoint: one HTTP round trip per command, no connection. */
function kvRestExecutor(url: string, token: string): CommandExecutor {
  return async (command) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    // The status only. A body could echo the command, and commands carry keys.
    if (!res.ok) throw new Error(`KV request failed with status ${res.status}`);
    const json = (await res.json()) as { result: unknown };
    return json.result;
  };
}

/**
 * Normalises a driver reply to what the REST backend returns.
 *
 * The store's parsers expect strings, numbers and null. A driver may hand back
 * Buffers depending on negotiation, and `JSON.parse(<Buffer>)` fails in a way
 * that looks like corrupted data rather than a type mismatch, so the shape is
 * pinned here instead of at each of the dozen call sites.
 */
function normalizeReply(value: unknown): unknown {
  if (value instanceof Buffer) return value.toString('utf8');
  if (Array.isArray(value)) return value.map(normalizeReply);
  return value;
}

/**
 * A real Redis connection, opened once and shared.
 *
 * The client is created lazily and cached as a promise so concurrent requests
 * on a warm instance share one connection rather than opening one each. A
 * failed connect clears the cache, so the next request retries instead of
 * inheriting a permanently rejected promise.
 */
function redisExecutor(url: string): CommandExecutor {
  let clientPromise: ReturnType<typeof connect> | null = null;

  async function connect() {
    const client = createClient({
      url,
      socket: {
        /*
         * Both bounds exist because the default is to retry forever. On a
         * serverless function that is the worst failure mode available: the
         * request does not fail, it hangs until the platform kills it, so the
         * caller sees a timeout and the logs show nothing. Giving up quickly
         * turns an unreachable store into an error that says so.
         */
        connectTimeout: 5_000,
        reconnectStrategy: (retries) => (retries > 2 ? false : Math.min(100 * 2 ** retries, 1_000)),
      },
    });
    /*
     * node-redis throws on an unhandled 'error' event, which would take down
     * the function. The handler is deliberately silent about the error's
     * contents: REDIS_URL carries a password, and driver errors are one of the
     * places a connection string gets echoed into logs.
     */
    client.on('error', () => {});
    await client.connect();
    return client;
  }

  return async (command) => {
    clientPromise ??= connect();
    let client;
    try {
      client = await clientPromise;
    } catch {
      clientPromise = null;
      throw new Error('Redis connection failed');
    }
    // Redis speaks strings on the wire; `['SET', k, v, 'EX', 86400]` must not
    // send a raw number.
    const args = command.map((part) => String(part));
    return normalizeReply(await client.sendCommand(args));
  };
}

/** Which backend is live. Safe to surface: a name, never a credential. */
export type PersistenceBackend = 'kv-rest' | 'redis' | 'memory';

export const persistenceBackend: PersistenceBackend =
  kvUrl && kvToken ? 'kv-rest' : redisUrl ? 'redis' : 'memory';

const executor: CommandExecutor | null =
  kvUrl && kvToken
    ? kvRestExecutor(kvUrl, kvToken)
    : redisUrl
      ? redisExecutor(redisUrl)
      : null;

export const usingPersistentStore = executor !== null;

/**
 * True on a Vercel deployment. `VERCEL` is set by the platform in every
 * deployed environment and by nothing else, so this cannot be true locally.
 */
const isDeployed = Boolean(process.env.VERCEL);

const NO_PERSISTENCE =
  'Storage is not configured on this deployment. Set REDIS_URL (or KV_REST_API_URL + ' +
  'KV_REST_API_TOKEN). Refusing to serve from memory, which would lose data on the next cold start.';

/**
 * The live executor, or null when an in-memory store is legitimate.
 *
 * Deployed with nothing configured is not a degraded mode, it is a broken one:
 * writes would appear to succeed and then vanish. So it raises here rather than
 * handing back a Map that lies.
 */
function requireExecutor(): CommandExecutor | null {
  if (executor) return executor;
  if (isDeployed) throw new Error(NO_PERSISTENCE);
  return null;
}

/* ---- global directory: NOT user-scoped, owner-portal use only ---- */

const USERS_KEY = 'zoey:users';
const memoryUsers = new Map<string, StoredUserRef>();

/**
 * Records that a verified user exists. Called on every authenticated request,
 * so the directory fills itself without needing a Supabase service-role key --
 * which must never reach the app or this deployment.
 */
export async function registerUser(userId: string, email?: string): Promise<void> {
  const now = Date.now();
  const call = requireExecutor();
  if (!call) {
    const existing = memoryUsers.get(userId);
    memoryUsers.set(userId, {
      userId,
      email: email ?? existing?.email,
      firstSeen: existing?.firstSeen ?? now,
      lastSeen: now,
    });
    return;
  }
  const raw = (await call(['HGET', USERS_KEY, userId])) as string | null;
  const existing = raw ? (JSON.parse(raw) as StoredUserRef) : null;
  const next: StoredUserRef = {
    userId,
    email: email ?? existing?.email,
    firstSeen: existing?.firstSeen ?? now,
    lastSeen: now,
  };
  await call(['HSET', USERS_KEY, userId, JSON.stringify(next)]);
}

/**
 * Removes one user's row from the owner directory.
 *
 * The directory is the one place a deleted user would otherwise linger: it is
 * global rather than user-scoped, so `Store#purge` cannot reach it. Keyed by
 * user id, so it can only ever remove the row it is given.
 */
export async function forgetUser(userId: string): Promise<boolean> {
  const call = requireExecutor();
  if (!call) return memoryUsers.delete(userId);
  const count = (await call(['HDEL', USERS_KEY, userId])) as number | null;
  return typeof count === 'number' && count > 0;
}

export async function listUsers(): Promise<StoredUserRef[]> {
  const call = requireExecutor();
  if (!call) return [...memoryUsers.values()];
  const rows = (await call(['HVALS', USERS_KEY])) as string[] | null;
  return (rows ?? []).map((r) => JSON.parse(r) as StoredUserRef);
}

const tenantStores = new Map<string, Store>();

/** Every read/write is namespaced to the verified Supabase user id. */
export function storeFor(userId: string): Store {
  let scoped = tenantStores.get(userId);
  if (!scoped) {
    const call = requireExecutor();
    scoped = call ? createCommandStore(call, userId) : createMemoryStore();
    tenantStores.set(userId, scoped);
  }
  return scoped;
}

/**
 * A raw command against the shared store, for state that is not a user's data.
 *
 * The owner session lives here rather than in a `zoey:user:*` namespace because it belongs to
 * nobody's file -- and because it MUST be shared: a session held in one serverless instance's memory
 * would log the owner out every time a different instance answered, and could never be revoked.
 *
 * Returns null when no persistent store is configured, and callers treat that as "cannot
 * authenticate" rather than "authenticate anyway".
 */
export async function sharedStoreCommand(command: unknown[]): Promise<unknown | null> {
  const call = requireExecutor();
  if (!call) return null;
  return call(command);
}
