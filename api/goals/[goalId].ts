import { applyCors, readBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { requireUser } from '../_lib/auth.js';
import { storeFor, type StoredGoal } from '../_lib/store.js';

/**
 * PATCH  /api/goals/:goalId  -> { goal }    (title, targetValue, note, status)
 * DELETE /api/goals/:goalId  -> { deleted }
 *
 * Archiving is a status change, not a delete, so a completed goal stays part of
 * the client's history. DELETE is only for removing one created by mistake.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).json(null);
    return;
  }
  const user = await requireUser(req, res); if (!user) return;
  const store = storeFor(user.id);

  const raw = req.query.goalId;
  const goalId = Array.isArray(raw) ? raw[0] : raw;

  if (!goalId) {
    res.status(400).json({ error: 'goalId is required' });
    return;
  }

  const existing = await store.getGoal(goalId);
  if (!existing) {
    res.status(404).json({ error: 'Unknown goal' });
    return;
  }

  if (req.method === 'DELETE') {
    await store.deleteGoal(goalId);
    res.status(200).json({ deleted: goalId });
    return;
  }

  if (req.method !== 'PATCH' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use PATCH or DELETE.' });
    return;
  }

  const body = readBody<{
    title: string;
    targetValue: number;
    note: string;
    status: StoredGoal['status'];
  }>(req.body);

  const next: StoredGoal = { ...existing };

  if (typeof body.title === 'string' && body.title.trim()) {
    next.title = body.title.trim().slice(0, 120);
  }

  if (body.targetValue !== undefined) {
    if (!existing.unit) {
      res.status(400).json({ error: 'This goal type has no numeric target' });
      return;
    }
    if (typeof body.targetValue !== 'number' || Number.isNaN(body.targetValue)) {
      res.status(400).json({ error: 'targetValue must be a number' });
      return;
    }
    const max = existing.unit === 'score' ? 900 : existing.unit === 'percent' ? 100 : 999;
    if (body.targetValue < 0 || body.targetValue > max) {
      res.status(400).json({ error: `targetValue must be between 0 and ${max}` });
      return;
    }
    next.targetValue = Math.round(body.targetValue);
  }

  if (typeof body.note === 'string') {
    next.note = body.note.trim().slice(0, 300) || undefined;
  }

  if (body.status) {
    if (!['active', 'completed', 'archived'].includes(body.status)) {
      res.status(400).json({ error: 'status must be active, completed or archived' });
      return;
    }
    next.status = body.status;
  }

  next.updatedAt = Date.now();
  await store.putGoal(next);

  res.status(200).json({ goal: next });
}
