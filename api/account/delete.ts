import { applyCors, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { requireUser } from '../_lib/auth.js';
import { forgetUser, storeFor } from '../_lib/store.js';

/**
 * POST /api/account/delete  ->  { deleted: true, removed: string[] }
 *
 * ==========================  WHY THIS IS A SERVER ROUTE  ==========================
 *
 * Deleting a Supabase auth user is a privileged operation. It needs the
 * service-role key, which bypasses every row-level policy in the project --
 * shipping it to the app would hand every installed copy the ability to delete
 * anyone. So the key lives here, in server env only, and the client's only
 * capability is "delete the account this bearer token belongs to".
 *
 * ==========================  WHOSE ACCOUNT  ==========================
 *
 * `requireUser` verifies the bearer token against Supabase and returns the id
 * IT says the token belongs to. That id is the only one used: it names the KV
 * namespace, the directory row and the auth user. The request body is never
 * read, so there is no field a caller could set to point this at somebody else,
 * and no id from the client is trusted for anything.
 *
 * ==========================  IT REFUSES RATHER THAN HALF-DELETES  ==========================
 *
 * The service-role key is checked BEFORE anything is erased. Without it the
 * auth user cannot be removed, and purging the data first would leave a person
 * who can still sign in to an account with nothing in it -- worse than either
 * outcome and impossible to undo. So the route fails closed, with 503 and a
 * message naming what the deployment is missing.
 *
 * The auth user is deleted LAST, for the same reason in reverse: if it failed
 * after a purge, the caller would get an error for an account whose data was
 * already gone. Data first, identity last, and the whole thing reports what it
 * actually removed rather than what it intended to.
 */

type DeleteOutcome = { deleted: true; removed: string[] };

export default async function handler(req: ApiRequest, res: ApiResponse) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).json(null);
    return;
  }

  // POST only. A GET or a link preview must never be able to trigger this.
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  // Server-only, and deliberately NOT read from any EXPO_PUBLIC_ variable --
  // anything with that prefix is bundled into the app.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    res.status(503).json({
      error:
        'Account deletion is not configured on the server yet. Nothing was deleted. ' +
        'Set SUPABASE_SERVICE_ROLE_KEY in the server environment to enable it.',
    });
    return;
  }

  const store = storeFor(user.id);
  const removed: string[] = [];

  try {
    removed.push(...(await store.purge()));
  } catch {
    res.status(502).json({
      error: 'Your account data could not be deleted. Nothing was removed — please try again.',
    });
    return;
  }

  try {
    if (await forgetUser(user.id)) removed.push('directory');
  } catch {
    // The directory row is owner-facing bookkeeping, not client data, and the
    // account itself must still be closable. Reported by omission from
    // `removed` rather than by failing a deletion that otherwise succeeded.
  }

  // Supabase Admin API. The id comes from the verified token, never the body.
  let authRes: Response;
  try {
    authRes = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
  } catch {
    res.status(502).json({
      error:
        'Your data was deleted, but your sign-in could not be removed. ' +
        'Contact support so it can be finished — do not create a new account yet.',
    });
    return;
  }

  // 404 means the auth user is already gone: a retry after a partial failure.
  // That is the desired end state, so it counts as success rather than error.
  if (!authRes.ok && authRes.status !== 404) {
    res.status(502).json({
      error:
        'Your data was deleted, but your sign-in could not be removed. ' +
        'Contact support so it can be finished — do not create a new account yet.',
    });
    return;
  }

  removed.push('sign-in');

  const outcome: DeleteOutcome = { deleted: true, removed };
  res.status(200).json(outcome);
}
