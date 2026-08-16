import { guard, newId, readBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { REQUIRED_DOC_IDS } from '../_lib/pipeline.js';
import { requireUser } from '../_lib/auth.js';
import { storeFor } from '../_lib/store.js';

/**
 * POST /api/analysis/start
 *
 * Validates the intake set and opens an analysis job.
 *
 * Body: {}  -- the required set is read from the server's own document record,
 *             never from the client, so a client cannot start analysis by
 *             claiming documents it has not uploaded.
 * 200:  { jobId, startedAt }
 * 409:  { error, missing: string[] }  -- intake incomplete
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (guard(req, res, 'POST')) return;
  const user = await requireUser(req, res); if (!user) return;
  const store = storeFor(user.id);

  readBody(req.body); // no fields today; kept so the contract can grow

  const docs = await store.listDocs();
  const filled = new Set(docs.map((d) => d.slotId));
  const missing = REQUIRED_DOC_IDS.filter((id) => !filled.has(id));

  if (missing.length > 0) {
    res.status(409).json({
      error: 'Required documents are missing',
      missing,
    });
    return;
  }

  const job = {
    jobId: newId('job'),
    documentIds: docs.map((d) => d.docId),
    startedAt: Date.now(),
  };

  await store.putJob(job);
  res.status(200).json({ jobId: job.jobId, startedAt: job.startedAt });
}
