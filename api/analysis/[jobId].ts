import { guard, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { STAGES, deriveStages, statusFromStages } from '../_lib/pipeline.js';
import { requireUser } from '../_lib/auth.js';
import { storeFor } from '../_lib/store.js';

/**
 * GET /api/analysis/:jobId
 *
 * The status the app polls.
 *
 * 200: {
 *   jobId, status: 'running' | 'complete' | 'failed',
 *   stages: { [stageId]: 'pending' | 'active' | 'done' | 'failed' },
 *   labels: { [stageId]: string },   -- so stage naming is server-owned
 *   blockedReason?: string
 * }
 * 404: { error }
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (guard(req, res, 'GET')) return;
  const user = await requireUser(req, res); if (!user) return;
  const store = storeFor(user.id);

  const raw = req.query.jobId;
  const jobId = Array.isArray(raw) ? raw[0] : raw;

  if (!jobId) {
    res.status(400).json({ error: 'jobId is required' });
    return;
  }

  const job = await store.getJob(jobId);

  if (!job) {
    res.status(404).json({ error: 'Unknown job' });
    return;
  }

  const labels = Object.fromEntries(STAGES.map((s) => [s.id, s.label]));

  if (job.failed) {
    const stages = deriveStages(job.failed ? Date.now() - job.startedAt : 0);
    res.status(200).json({
      jobId,
      status: 'failed',
      stages,
      labels,
      blockedReason: job.failed.reason,
    });
    return;
  }

  const stages = deriveStages(Date.now() - job.startedAt);

  res.status(200).json({
    jobId,
    status: statusFromStages(stages),
    stages,
    labels,
  });
}
