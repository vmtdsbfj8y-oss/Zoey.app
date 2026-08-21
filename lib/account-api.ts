/**
 * Service layer for the More section: profile, subscription, goals, scores.
 *
 * These are the shared models Zoey will read later -- her intelligence layer
 * should call this module rather than re-fetching or keeping its own copy of a
 * client's goal, score or plan. Keeping one module as the single definition of
 * these shapes is what stops the More screens becoming dead-end UI.
 *
 * Base URL is shared with the analyzer client so there is one place to point at
 * a different environment.
 */
import { requireApiBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';

export type Profile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  notifications?: {
    disputeUpdates?: boolean;
    documentRequests?: boolean;
    scoreChanges?: boolean;
    productNews?: boolean;
  };
  /** Append-only record of which documents this account accepted, and at which version. */
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

export type Goal = {
  goalId: string;
  kind: GoalKind;
  title: string;
  targetValue?: number | null;
  unit?: 'score' | 'percent' | 'items' | null;
  note?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
  updatedAt: number;
};

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'none'
  | 'not_connected';

export type MembershipStatus = 'free' | 'active';

export type Membership = {
  status: MembershipStatus;
  /** 'Free Member' | 'Zoey Member'. */
  label: string;
  activeUntil: number | null;
  startedAt: number | null;
  provider: string | null;
  source: string | null;
};

export const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  free: 'Free Member',
  active: 'Zoey Member',
};

/** The published price. Not charged anywhere yet. */
/**
 * The published Zoey Membership price. Single source -- every screen reads it,
 * so the number cannot drift between the paywall, the CTAs and the API.
 * `weeklyEquivalent` is marketing copy only; billing is monthly.
 */
export const MEMBERSHIP_PRICE = {
  amount: 49.99,
  currency: 'USD',
  interval: 'month',
  weeklyEquivalent: 'Less than $12/week',
} as const;

/** Fails closed: anything unknown is free. Never grant access on uncertainty. */
export const FREE_MEMBERSHIP: Membership = {
  status: 'free',
  label: MEMBERSHIP_LABEL.free,
  activeUntil: null,
  startedAt: null,
  provider: null,
  source: null,
};

export type Subscription = {
  /** Zoey entitlement. Server-owned; the app can only read it. */
  membership?: Membership;
  status: SubscriptionStatus;
  provider: string | null;
  plan?: {
    name: string;
    priceCents: number;
    currency: string;
    interval: 'month' | 'year';
    currentPeriodEnd?: number;
    cancelAtPeriodEnd?: boolean;
  };
  manageUrl?: string;
};

export type BureauName = 'TransUnion' | 'Experian' | 'Equifax';

export type BureauScore = {
  scoreId: string;
  bureau: BureauName;
  score: number;
  model?: string;
  sourceDocId?: string;
  /** When Zoey read the number out of the report. */
  capturedAt: number;
  /**
   * When the report it came from was received.
   *
   * Not the date the bureau printed on the document -- nothing extracts that -- so the app says
   * "from your report" against it rather than implying the report asserts this date itself.
   */
  reportReceivedAt?: number;
};

export type Scores = {
  latest: BureauScore[];
  history: { bureau: BureauName; entries: { score: number; capturedAt: number; model?: string }[] }[];
  extractionAvailable: boolean;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Resolved per request, and NOT wrapped in the network catch below: a
  // configuration problem must report itself as one. Reporting "check your
  // connection" when the real fault is an unset API URL is what made the
  // original failure so hard to place.
  const baseUrl = requireApiBaseUrl();

  let res: Response;
  try {
    res = await authenticatedFetch(`${baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (err) {
    // `authenticatedFetch` throws its own error when there is no access token.
    // Swallowing that into "Can't reach Zoey" reported a network fault for what
    // is actually a session problem, and made the real cause undiagnosable from
    // the screen. Only a genuine transport failure gets the network message.
    if (err instanceof Error && /session/i.test(err.message)) throw err;
    const detail = err instanceof Error ? ` (${err.message})` : '';
    throw new Error(`Can't reach Zoey at ${baseUrl}${detail}. Check your connection and try again.`);
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? '';
    } catch {
      // non-JSON error body; the status alone is enough
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }

  return (await res.json()) as T;
}

/* account ----------------------------------------------------------------- */

/**
 * Permanently deletes the signed-in account.
 *
 * The client sends nothing but its bearer token: WHICH account is decided
 * server-side from that token, so there is no id here to get wrong or to
 * tamper with. The route refuses outright if the server cannot also remove the
 * sign-in, rather than leaving data deleted behind a login that still works --
 * so an error from this call means nothing was destroyed unless the message
 * says otherwise.
 *
 * `removed` names the categories that were actually erased. It carries no
 * content, only labels.
 */
export async function deleteAccount(): Promise<{ removed: string[] }> {
  const { removed } = await request<{ deleted: true; removed: string[] }>('/api/account/delete', {
    method: 'POST',
  });
  return { removed };
}

/* profile ----------------------------------------------------------------- */

export async function getProfile() {
  const { profile } = await request<{ profile: Profile }>('/api/profile');
  return profile;
}

/** Merge-patch. Only the fields you pass are changed; '' clears a field. */
/**
 * Records that this account accepted the current Terms and Privacy Policy.
 *
 * Best-effort by design, and called AFTER the account exists. The alternative -- refusing to finish
 * signup because a consent write failed -- would leave a person who did agree unable to get in,
 * which is a worse outcome than a missing record that can be re-captured. The server appends and
 * de-duplicates, so a retry on the next launch costs nothing.
 */
export async function recordLegalAcceptance(records: NonNullable<Profile['legalAcceptance']>) {
  return updateProfile({ legalAcceptance: records });
}

export async function updateProfile(patch: Partial<Profile>) {
  const { profile } = await request<{ profile: Profile }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return profile;
}

/* subscription ------------------------------------------------------------ */

export async function getSubscription() {
  return request<Subscription>('/api/subscription');
}

/**
 * The user's membership, straight from the server.
 *
 * Reuses the existing subscription endpoint rather than adding a parallel one.
 * An older server that does not yet return `membership` resolves to free, which
 * is the safe direction.
 */
export async function getMembership(): Promise<Membership> {
  const sub = await request<Subscription>('/api/subscription');
  const m = sub.membership;
  if (!m || (m.status !== 'free' && m.status !== 'active')) return FREE_MEMBERSHIP;
  return {
    status: m.status,
    label: MEMBERSHIP_LABEL[m.status],
    activeUntil: typeof m.activeUntil === 'number' ? m.activeUntil : null,
    startedAt: typeof m.startedAt === 'number' ? m.startedAt : null,
    provider: m.provider ?? null,
    source: m.source ?? null,
  };
}

/** Short status for the More row. Null when there is nothing truthful to show. */
export function subscriptionLabel(sub: Subscription | undefined): string | null {
  if (!sub) return null;
  switch (sub.status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial';
    case 'past_due':
      return 'Payment required';
    case 'canceled':
      return 'Canceled';
    case 'none':
      return 'No active subscription';
    // We have not checked a provider, so we must not claim either way.
    case 'not_connected':
      return 'Not set up';
  }
}

/* goals ------------------------------------------------------------------- */

export async function listGoals() {
  const { goals } = await request<{ goals: Goal[] }>('/api/goals');
  return goals;
}

export async function createGoal(input: {
  kind: GoalKind;
  title: string;
  targetValue?: number;
  note?: string;
}) {
  const { goal } = await request<{ goal: Goal }>('/api/goals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return goal;
}

export async function updateGoal(
  goalId: string,
  patch: { title?: string; targetValue?: number; note?: string; status?: Goal['status'] }
) {
  const { goal } = await request<{ goal: Goal }>(`/api/goals/${encodeURIComponent(goalId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return goal;
}

export async function deleteGoal(goalId: string) {
  await request<{ deleted: string }>(`/api/goals/${encodeURIComponent(goalId)}`, {
    method: 'DELETE',
  });
}

/* scores ------------------------------------------------------------------ */

export async function getScores() {
  return request<Scores>('/api/scores');
}

/**
 * Progress toward a goal, or null when it cannot be computed truthfully.
 *
 * Returns null rather than 0 when there is no current reading -- an empty
 * progress bar reads as "no progress made", which is a different claim from
 * "we don't have a current score yet".
 */
export function goalProgress(goal: Goal, currentValue: number | undefined): number | null {
  if (goal.targetValue == null || currentValue == null) return null;
  if (goal.targetValue <= 0) return null;

  // Utilization is a reduce-to-target goal: lower is better.
  if (goal.unit === 'percent') {
    if (currentValue <= goal.targetValue) return 1;
    return Math.max(0, Math.min(1, goal.targetValue / currentValue));
  }

  return Math.max(0, Math.min(1, currentValue / goal.targetValue));
}
