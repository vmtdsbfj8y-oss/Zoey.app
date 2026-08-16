import { applyCors, newId, readBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { requireUser } from '../_lib/auth.js';
import { storeFor, type GoalKind, type StoredGoal } from '../_lib/store.js';

/**
 * GET  /api/goals          -> { goals }
 * POST /api/goals          -> { goal }
 *
 * Goals persist through the same store as documents and jobs, so they survive
 * app restarts (and survive across devices once KV is attached). Nothing about
 * a goal is held only in component state.
 */

export const GOAL_KINDS: GoalKind[] = [
  'target-score',
  'vehicle',
  'home',
  'business-funding',
  'utilization',
  'negative-items',
  'positive-history',
  'custom',
];

/** Unit is a property of the goal type, not something the client picks. */
const UNIT_FOR: Record<GoalKind, StoredGoal['unit']> = {
  'target-score': 'score',
  utilization: 'percent',
  'negative-items': 'items',
  vehicle: null,
  home: null,
  'business-funding': null,
  'positive-history': null,
  custom: null,
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).json(null);
    return;
  }
  const user = await requireUser(req, res); if (!user) return;
  const store = storeFor(user.id);

  if (req.method === 'GET') {
    const goals = await store.listGoals();
    res.status(200).json({ goals });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
    return;
  }

  const body = readBody<{ kind: GoalKind; title: string; targetValue: number; note: string }>(
    req.body
  );

  if (!body.kind || !GOAL_KINDS.includes(body.kind)) {
    res.status(400).json({ error: 'kind must be one of: ' + GOAL_KINDS.join(', ') });
    return;
  }

  const title = (body.title ?? '').trim();
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const unit = UNIT_FOR[body.kind];
  let targetValue: number | null = null;

  if (unit) {
    if (typeof body.targetValue !== 'number' || Number.isNaN(body.targetValue)) {
      res.status(400).json({ error: `${body.kind} requires a numeric targetValue` });
      return;
    }
    // Bounds by unit -- a 2000 target score or -5% utilization is a client bug,
    // and storing it would produce nonsense progress downstream.
    const max = unit === 'score' ? 900 : unit === 'percent' ? 100 : 999;
    if (body.targetValue < 0 || body.targetValue > max) {
      res.status(400).json({ error: `targetValue must be between 0 and ${max}` });
      return;
    }
    targetValue = Math.round(body.targetValue);
  }

  const now = Date.now();
  const goal: StoredGoal = {
    goalId: newId('goal'),
    kind: body.kind,
    title: title.slice(0, 120),
    targetValue,
    unit,
    note: (body.note ?? '').trim().slice(0, 300) || undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await store.putGoal(goal);
  res.status(200).json({ goal });
}
