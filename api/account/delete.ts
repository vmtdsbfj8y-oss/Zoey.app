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
 *
 * ==========================  THE ENGINE GOES FIRST  ==========================
 *
 * This route used to delete the KV store and the sign-in and call that "delete
 * my account". It was not. Everything that actually matters about a Zoey client
 * -- the credit report, the Social Security card, the government ID, the
 * scores, the dispute history -- lives in the credit engine, a separate
 * deployment this route never contacted. A person could be told their account
 * was gone while their identity documents stayed exactly where they were.
 *
 * So the engine is now called FIRST, with the caller's own bearer token, and a
 * failure there stops everything: the sign-in survives, the app data survives,
 * and the caller can retry. The alternative ordering is the one bad outcome --
 * deleting the identity first would strand a credit file that nobody can
 * authenticate to any more, and therefore nobody can ever delete.
 *
 * The engine call is skipped only when the deployment has no engine configured
 * at all, which is a local/dev shape rather than a live one; a configured
 * engine that ERRORS is never skipped.
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

  const removed: string[] = [];

  /*
   * STEP ONE, AND THE ONE THAT MUST NOT BE SKIPPED.
   *
   * The consumer's own bearer token is forwarded, so the engine decides which
   * credit file this is from a signature it verifies itself. No client id is
   * sent, because sending one would create a second way to choose a file and the
   * first one being correct would stop mattering.
   */
  const engineUrl = (process.env.ZOEY_ENGINE_URL ?? process.env.EXPO_PUBLIC_ZOEY_ENGINE_URL ?? '').replace(/\/+$/, '');
  if (engineUrl) {
    const bearer = req.headers?.authorization;
    let engineRes: Response;
    try {
      engineRes = await fetch(`${engineUrl}/api/mobile/account/delete`, {
        method: 'POST',
        headers: {
          Authorization: typeof bearer === 'string' ? bearer : '',
          'Content-Type': 'application/json',
        },
        // Deliberately empty. There is nothing to say: the token names the file.
        body: '{}',
      });
    } catch {
      res.status(502).json({
        error:
          'Zoey could not reach your credit records to delete them, so nothing was deleted. ' +
          'Check your connection and try again.',
      });
      return;
    }

    if (!engineRes.ok) {
      /*
       * The engine's own consumer-facing sentence is preferred when it sent one
       * -- it is the only thing that can explain a refusal like certified mail
       * currently being out with the bureaus. Anything else it might return is
       * discarded: no status text, no provider body, no internal identifier.
       */
      let message = '';
      try {
        const body = (await engineRes.json()) as { error?: unknown };
        if (typeof body?.error === 'string' && body.error.length <= 400) message = body.error;
      } catch {
        message = '';
      }
      res.status(engineRes.status === 409 ? 409 : 502).json({
        error:
          message ||
          'Your credit records could not be deleted, so nothing was deleted. Please try again.',
      });
      return;
    }

    removed.push('credit records');
  }

  const store = storeFor(user.id);

  try {
    removed.push(...(await store.purge()));
  } catch {
    res.status(502).json({
      error:
        'Your credit records were deleted, but the rest of your account data could not be. ' +
        'Your sign-in is untouched — try again to finish.',
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
