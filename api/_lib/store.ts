/**
 * Persistence for received documents and analysis jobs.
 *
 * Two backends, chosen at import time:
 *
 *   - Upstash / Vercel KV, when KV_REST_API_URL + KV_REST_API_TOKEN are set.
 *     This is the one that actually persists. Vercel injects both env vars when
 *     you attach a KV store, and it speaks plain REST, so there is no client
 *     library to install.
 *
 *   - An in-process Map otherwise. Fine for local dev; on serverless it only
 *     holds for the life of a warm instance, so a job started on one instance
 *     can 404 on another. Attach KV before this is used for anything real.
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

function createKvStore(url: string, token: string, userId: string): Store {
  const prefix = `zoey:user:${userId}`;
  const DOCS_KEY = `${prefix}:docs`;
  const PROFILE_KEY = `${prefix}:profile`;
  const GOALS_KEY = `${prefix}:goals`;
  const SCORES_KEY = `${prefix}:scores`;
  const MEMBERSHIP_KEY = `${prefix}:membership`;
  const jobKey = (id: string) => `${prefix}:job:${id}`;
  const call = async (command: unknown[]) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    if (!res.ok) throw new Error(`KV ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { result: unknown };
    return json.result;
  };

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

const kvUrl = process.env.KV_REST_API_URL;
const kvToken = process.env.KV_REST_API_TOKEN;

export const usingPersistentStore = Boolean(kvUrl && kvToken);

/* ---- global directory: NOT user-scoped, owner-portal use only ---- */

const USERS_KEY = 'zoey:users';
const memoryUsers = new Map<string, StoredUserRef>();

async function kvCall(command: unknown[]) {
  const res = await fetch(kvUrl as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`KV ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { result: unknown }).result;
}

/**
 * Records that a verified user exists. Called on every authenticated request,
 * so the directory fills itself without needing a Supabase service-role key --
 * which must never reach the app or this deployment.
 */
export async function registerUser(userId: string, email?: string): Promise<void> {
  const now = Date.now();
  if (!(kvUrl && kvToken)) {
    const existing = memoryUsers.get(userId);
    memoryUsers.set(userId, {
      userId,
      email: email ?? existing?.email,
      firstSeen: existing?.firstSeen ?? now,
      lastSeen: now,
    });
    return;
  }
  const raw = (await kvCall(['HGET', USERS_KEY, userId])) as string | null;
  const existing = raw ? (JSON.parse(raw) as StoredUserRef) : null;
  const next: StoredUserRef = {
    userId,
    email: email ?? existing?.email,
    firstSeen: existing?.firstSeen ?? now,
    lastSeen: now,
  };
  await kvCall(['HSET', USERS_KEY, userId, JSON.stringify(next)]);
}

/**
 * Removes one user's row from the owner directory.
 *
 * The directory is the one place a deleted user would otherwise linger: it is
 * global rather than user-scoped, so `Store#purge` cannot reach it. Keyed by
 * user id, so it can only ever remove the row it is given.
 */
export async function forgetUser(userId: string): Promise<boolean> {
  if (!(kvUrl && kvToken)) return memoryUsers.delete(userId);
  const count = (await kvCall(['HDEL', USERS_KEY, userId])) as number | null;
  return typeof count === 'number' && count > 0;
}

export async function listUsers(): Promise<StoredUserRef[]> {
  if (!(kvUrl && kvToken)) return [...memoryUsers.values()];
  const rows = (await kvCall(['HVALS', USERS_KEY])) as string[] | null;
  return (rows ?? []).map((r) => JSON.parse(r) as StoredUserRef);
}

const tenantStores = new Map<string, Store>();

/** Every read/write is namespaced to the verified Supabase user id. */
export function storeFor(userId: string): Store {
  let scoped = tenantStores.get(userId);
  if (!scoped) {
    scoped = kvUrl && kvToken ? createKvStore(kvUrl, kvToken, userId) : createMemoryStore();
    tenantStores.set(userId, scoped);
  }
  return scoped;
}
