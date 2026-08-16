import { guard, newId, readBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { requireUser } from '../_lib/auth.js';
import { storeFor } from '../_lib/store.js';

/**
 * POST /api/documents/upload
 *
 * Registers a document against an intake slot and returns its id.
 *
 * Body: { slotId: string, filename?: string }
 * 200:  { docId, slotId, receivedAt }
 *
 * NOTE: this records that a slot has been filled; it does not accept file
 * bytes. Wiring real file transfer (multipart or a signed direct-to-storage
 * URL) is a separate piece of work -- the app has no file picker yet.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (guard(req, res, 'POST')) return;
  const user = await requireUser(req, res); if (!user) return;
  const store = storeFor(user.id);

  const { slotId, filename } = readBody<{ slotId: string; filename: string }>(req.body);

  if (!slotId || typeof slotId !== 'string') {
    res.status(400).json({ error: 'slotId is required' });
    return;
  }

  const doc = {
    docId: newId('doc'),
    slotId,
    filename,
    receivedAt: Date.now(),
  };

  await store.putDoc(doc);
  res.status(200).json(doc);
}
