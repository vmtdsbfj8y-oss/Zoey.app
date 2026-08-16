import { applyCors, readBody, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { storeFor, type StoredProfile } from './_lib/store.js';

/**
 * GET  /api/profile  -> { profile, fields }
 * PATCH/POST /api/profile  -> { profile }   (merge; only known fields)
 *
 * ---------------------------------------------------------------------------
 * NO AUTHENTICATION EXISTS IN THIS PROJECT YET, so this is a SINGLE-TENANT
 * record: every caller reads and writes the same profile. That is acceptable
 * for a preview build and is NOT acceptable in production. Scoping this per
 * user is the job of whatever auth layer lands next -- key the store on the
 * session's user id and this file barely changes.
 *
 * Because of that, the field set is deliberately limited to contact details a
 * client would put on a form. No SSN, date of birth, password, token or full
 * identity data is accepted or returned, so there is nothing here worth leaking
 * while the endpoint is unauthenticated.
 * ---------------------------------------------------------------------------
 */

/** Allow-list. Anything not named here is dropped rather than persisted. */
const TEXT_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'city', 'state'] as const;
const NOTIFICATION_FIELDS = [
  'disputeUpdates',
  'documentRequests',
  'scoreChanges',
  'productNews',
] as const;

const EMPTY: StoredProfile = { notifications: {} };

export default async function handler(req: ApiRequest, res: ApiResponse) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).json(null);
    return;
  }
  const user = await requireUser(req, res); if (!user) return;
  const store = storeFor(user.id);

  if (req.method === 'GET') {
    const profile = (await store.getProfile()) ?? EMPTY;
    res.status(200).json({ profile, editableFields: TEXT_FIELDS });
    return;
  }

  if (req.method !== 'PATCH' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use GET or PATCH.' });
    return;
  }

  const body = readBody<StoredProfile>(req.body);
  const current = (await store.getProfile()) ?? EMPTY;
  const next: StoredProfile = { ...current, notifications: { ...current.notifications } };

  for (const key of TEXT_FIELDS) {
    const value = body[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      res.status(400).json({ error: `${key} must be a string` });
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length > 120) {
      res.status(400).json({ error: `${key} is too long` });
      return;
    }
    // Empty string clears the field rather than storing "".
    if (trimmed === '') delete next[key];
    else next[key] = trimmed;
  }

  if (body.notifications) {
    for (const key of NOTIFICATION_FIELDS) {
      const value = body.notifications[key];
      if (typeof value === 'boolean') next.notifications![key] = value;
    }
  }

  next.updatedAt = Date.now();
  await store.putProfile(next);

  res.status(200).json({ profile: next });
}
