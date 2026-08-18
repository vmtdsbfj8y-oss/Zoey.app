import { requireUser } from '../_lib/auth.js';
import { currentMilestoneLabel, milestonesFromStages } from '../_lib/credit-services.js';
import { guard, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getMembershipFor } from '../_lib/membership.js';
import { REQUIRED_DOC_IDS, STAGES, deriveStages, statusFromStages } from '../_lib/pipeline.js';
import { storeFor } from '../_lib/store.js';

/**
 * GET /api/analysis/:jobId — the status the app polls.
 *
 * ## Membership shapes the RESPONSE, not just the UI
 *
 * Basic Credit Services belong to every client, so both tiers receive `status`
 * and the coarse `milestones`. The premium software layer -- the per-stage map
 * and stage labels that drive the round timeline -- is returned ONLY to a Zoey
 * Member.
 *
 * Enforced here rather than in the app: a free client calling this endpoint
 * directly gets exactly what a free client is entitled to. Hiding it in the
 * frontend would not be a control.
 *
 * Free tier:   { jobId, status, milestones, currentMilestone }
 * Member tier: + { stages, labels }
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (guard(req, res, 'GET')) return;
  const user = await requireUser(req, res);
  if (!user) return;
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

  const stages = deriveStages(job.failed ? 0 : Date.now() - job.startedAt);
  const status = job.failed ? 'failed' : statusFromStages(stages);

  // Intake completeness comes from the server's own document record, so the
  // milestone view cannot be talked into "complete" by the client.
  const docs = await store.listDocs();
  const filled = new Set(docs.map((d) => d.slotId));
  const intakeComplete = REQUIRED_DOC_IDS.every((id) => filled.has(id));

  const milestones = milestonesFromStages(stages, intakeComplete);

  const base = {
    jobId,
    status,
    milestones,
    currentMilestone: currentMilestoneLabel(milestones),
    ...(job.failed ? { blockedReason: job.failed.reason } : {}),
  };

  const membership = await getMembershipFor(user.id);

  if (membership.status !== 'active') {
    // Free client: coarse milestones only. No per-stage detail leaves here.
    res.status(200).json(base);
    return;
  }

  res.status(200).json({
    ...base,
    stages,
    labels: Object.fromEntries(STAGES.map((s) => [s.id, s.label])),
  });
}
