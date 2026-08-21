import { applyCors, readBody, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { storeFor, type StoredProfile } from './_lib/store.js';

/**
 * GET  /api/profile  -> { profile, fields }
 * PATCH/POST /api/profile  -> { profile }   (merge; only known fields)
 *
 * ---------------------------------------------------------------------------
 * AUTHENTICATED AND PER-USER. `requireUser` verifies the caller's session and
 * `storeFor(user.id)` scopes every read and write to that account, so one
 * consumer's profile is unreachable from another's session at the storage layer
 * rather than by filtering afterwards.
 *
 * (This block previously said no authentication existed and that the record was
 * single-tenant. That was true when it was written and became false when auth
 * landed. It is corrected rather than deleted because a comment claiming an
 * endpoint is unauthenticated is the kind of thing a future reader believes.)
 *
 * The field set is still deliberately limited to contact details a client would
 * put on a form. No SSN, date of birth, password, token or full identity data is
 * accepted or returned here.
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

  /*
   * Legal acceptances APPEND. They are a record of something that happened, not a setting, so a
   * later write must not be able to erase or rewrite an earlier agreement -- that is the whole
   * evidentiary value of storing them. A repeat of the same document at the same version is dropped
   * rather than duplicated, so re-sending the signup payload cannot inflate the history.
   *
   * The server stamps `acceptedAt` itself. A client-supplied timestamp on a consent record is worth
   * very little, and accepting one would mean the stored time is whatever the device's clock said.
   */
  if (Array.isArray(body.legalAcceptance)) {
    const existing = next.legalAcceptance ?? [];
    const additions: NonNullable<StoredProfile['legalAcceptance']> = [];
    for (const entry of body.legalAcceptance) {
      if (!entry || typeof entry !== 'object') continue;
      const { documentId, version } = entry as { documentId?: unknown; version?: unknown };
      if (typeof documentId !== 'string' || typeof version !== 'string') continue;
      if (documentId.length > 64 || version.length > 64) continue;
      const already = [...existing, ...additions].some(
        (record) => record.documentId === documentId && record.version === version
      );
      if (already) continue;
      additions.push({ documentId, version, acceptedAt: Date.now() });
    }
    if (additions.length) next.legalAcceptance = [...existing, ...additions];
  }

  next.updatedAt = Date.now();
  await store.putProfile(next);

  res.status(200).json({ profile: next });
}
