/**
 * The one official consumer-facing support contact, and the website that does not exist yet.
 *
 * ==============================  WHY THESE ARE SEPARATE  ==============================
 *
 * `SUPPORT_EMAIL` is live and monitored, so it is wired into the app as a tappable action.
 *
 * The website is now live, and `SUPPORT_URL_IS_LIVE` is true.
 *
 * It was false for as long as the domain answered every path -- /support, /privacy, /terms and a
 * deliberately nonsense path -- with a byte-identical "Coming Soon" page. All four returned HTTP
 * 200, which is what made that state dangerous: a link check reading only the status code would
 * have called it live and shipped a link to a construction page.
 *
 * The flag was flipped only after loading each page and seeing the real one, and after a nonsense
 * path returned a genuine 404 rather than the same body as everything else. Both conditions matter;
 * the second is what distinguishes a real site from a catch-all.
 *
 * If the site ever regresses, set this back to false rather than removing the links one by one --
 * every call site reads this constant.
 */

/** Monitored. Safe to show a consumer. */
export const SUPPORT_EMAIL = 'info@pinnaclecapitalusa.com';

/** The public site. HTTPS only -- `assertPinnacleHttpsUrl` below is what enforces that. */
const SITE_ORIGIN = 'https://pinnaclecapitalusa.com';

/**
 * The canonical public URLs, alongside the in-app document each one mirrors.
 *
 * The app keeps its own copy of every legal document and always will: a consumer reading the privacy
 * policy should not need a working network connection, and the app-native copy is what a stored
 * acceptance version refers to. These links are for the cases the app cannot serve -- sharing a
 * policy with someone who has no account, or an App Store reviewer following a URL.
 */
export const PUBLIC_URLS = {
  home: SITE_ORIGIN,
  zoey: `${SITE_ORIGIN}/zoey`,
  privacy: `${SITE_ORIGIN}/privacy`,
  terms: `${SITE_ORIGIN}/terms`,
  support: `${SITE_ORIGIN}/support`,
} as const;

export type PublicUrlKey = keyof typeof PUBLIC_URLS;

/** Retained name for the support page. */
export const PLANNED_SUPPORT_URL = PUBLIC_URLS.support;

/**
 * Whether the public site actually serves the pages it claims to.
 *
 * Verified by request rather than assumed. As of 2026-08-20 each of /, /zoey, /privacy, /terms and
 * /support returns its own page with its own title and no "Coming Soon" anywhere, a nonsense path
 * returns 404, and http:// redirects to https:// with a 308.
 */
export const SUPPORT_URL_IS_LIVE = true;

/**
 * Guards every URL the app is willing to open in a browser.
 *
 * Two rules, both narrow on purpose: HTTPS only, and the Pinnacle host only. An external link is the
 * one place a legal screen hands control to something outside the app, so the set of destinations is
 * a closed list checked at the point of use rather than a convention.
 */
export function assertPinnacleHttpsUrl(url: string): string {
  if (!url.startsWith(`${SITE_ORIGIN}/`) && url !== SITE_ORIGIN) {
    throw new Error('Refusing to open a URL outside the Pinnacle site.');
  }
  return url;
}

/** A mailto with a subject, so an incoming message arrives already labelled as coming from the app. */
export function supportMailto(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
