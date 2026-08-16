/**
 * The one place the Zoey API base URL is resolved.
 *
 * Every fetch in the app goes through this. Do not read
 * `process.env.EXPO_PUBLIC_ZOEY_API_URL` anywhere else and do not hardcode a
 * host in a screen or service.
 *
 * ## Why this exists
 *
 * The previous version fell back to `http://localhost:3000` whenever the
 * variable was unset. On a simulator that quietly works; on a real phone
 * `localhost` is the phone itself, so every request fails with a connection
 * error that surfaces as "Can't reach Zoey" — with nothing pointing at the
 * actual cause, which is that no API URL was ever configured. A silent default
 * that only works on the developer's machine is worse than no default.
 *
 * So: there is no implicit fallback. A missing or invalid value is a
 * configuration error with a message that says what to set.
 *
 * ## How it is set
 *
 * Expo inlines `EXPO_PUBLIC_*` at build time from `.env` files (see
 * `.env.example`) or from the environment of the `expo start` / EAS build.
 *
 *   local dev   .env.local            -> http://<your-LAN-IP>:3000
 *   preview     eas.json `preview`    -> https://<preview>.vercel.app
 *   production  eas.json `production` -> https://<production-domain>
 */

export type ApiBaseResolution =
  | { ok: true; baseUrl: string }
  | { ok: false; error: string };

const HINT =
  'Set EXPO_PUBLIC_ZOEY_API_URL (see .env.example) and restart the dev server with `npx expo start --clear`.';

/** Hosts where plain http is acceptable because the traffic never leaves the machine/LAN. */
function isLocalHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    // RFC1918 ranges -- a LAN IP pointing at `npm run api` during development.
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

/**
 * Pure resolver, exported so its rules can be tested without a device.
 *
 * @param raw   the configured value, or undefined
 * @param isDev whether this is a development build (`__DEV__`)
 */
export function resolveApiBaseUrl(raw: string | undefined, isDev: boolean): ApiBaseResolution {
  const value = raw?.trim();

  if (!value) {
    return { ok: false, error: `Zoey's API URL is not configured. ${HINT}` };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: `Zoey's API URL is not a valid URL: "${value}". ${HINT}` };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      ok: false,
      error: `Zoey's API URL must start with http:// or https:// (got "${url.protocol}"). ${HINT}`,
    };
  }

  const local = isLocalHost(url.hostname);

  // A release build pointed at localhost would ship an app that can only work
  // on a developer's machine. Refuse rather than fail mysteriously in the store.
  if (!isDev && local) {
    return {
      ok: false,
      error: `Zoey's API URL points at "${url.hostname}", which is not reachable from a released app. Point it at the hosted API.`,
    };
  }

  // Hosted traffic must be encrypted; plain http is only allowed on the LAN.
  if (url.protocol === 'http:' && !local) {
    return {
      ok: false,
      error: `Zoey's API URL must use https:// for hosted backends (got "${value}").`,
    };
  }

  // Normalise: no trailing slash, so callers can concatenate "/api/..." safely.
  const baseUrl = `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  return { ok: true, baseUrl };
}

const resolution = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_ZOEY_API_URL,
  typeof __DEV__ !== 'undefined' ? __DEV__ : false
);

/** The configured base, or null when configuration is missing/invalid. */
export const API_BASE_URL = resolution.ok ? resolution.baseUrl : null;

/** Human-readable configuration problem, or null when the base is usable. */
export const API_CONFIG_ERROR = resolution.ok ? null : resolution.error;

/**
 * The base URL, or a thrown configuration error.
 *
 * Callers surface the message directly, so a misconfigured build reports
 * "Zoey's API URL is not configured" instead of a generic network failure.
 */
export function requireApiBaseUrl(): string {
  if (!resolution.ok) throw new Error(resolution.error);
  return resolution.baseUrl;
}
