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

export type Subscription = {
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
  capturedAt: number;
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
  } catch {
    // Surfaced to the user as a retryable error rather than an empty screen.
    throw new Error(`Can't reach Zoey at ${baseUrl}. Check your connection and try again.`);
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

/* profile ----------------------------------------------------------------- */

export async function getProfile() {
  const { profile } = await request<{ profile: Profile }>('/api/profile');
  return profile;
}

/** Merge-patch. Only the fields you pass are changed; '' clears a field. */
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
