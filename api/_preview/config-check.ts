import type { ApiRequest, ApiResponse } from '../_lib/http.js';

/**
 * TEMPORARY, PREVIEW ONLY. DELETE AFTER USE.
 *
 * Reports which server-only settings the deployment can actually see, as
 * booleans. It exists to answer one question that cannot be answered from
 * outside -- does the running function have ZOEY_ENGINE_URL, so that
 * /api/account/delete takes the engine path rather than the "no engine
 * configured" skip.
 *
 * NO VALUE IS EVER RETURNED. Presence, and for the engine URL its host only,
 * so the binding can be confirmed as pointing at the Preview engine without
 * putting a secret in an HTTP response.
 *
 * GET only. 404 unless VERCEL_ENV is preview, and behind a constant-time secret.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (process.env.VERCEL_ENV !== 'preview') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const expected = process.env.PREVIEW_CONFIG_CHECK_SECRET ?? '';
  if (expected.length < 24) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const header = req.headers?.['x-preview-config-secret'];
  const supplied = Array.isArray(header) ? header[0] : header;
  if (!timingSafeEqual(supplied ?? '', expected)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const engineUrl = process.env.ZOEY_ENGINE_URL ?? '';
  let engineHost: string | null = null;
  try {
    engineHost = engineUrl ? new URL(engineUrl).host : null;
  } catch {
    engineHost = null;
  }

  res.status(200).json({
    vercelEnv: process.env.VERCEL_ENV ?? null,
    present: {
      ZOEY_ENGINE_URL: Boolean(engineUrl),
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL),
      SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    // Host only. Enough to prove which engine it points at; never the full value.
    engineHost,
    // The two gates /api/account/delete passes through, in the order it hits them.
    deletionReadiness: {
      serviceRoleKeyGate: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'WOULD_PASS' : 'WOULD_503_BEFORE_ENGINE_CALL',
      engineCall: engineUrl ? 'WOULD_CALL_ENGINE' : 'WOULD_SKIP_ENGINE',
    },
  });
}
