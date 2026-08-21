/**
 * The one official consumer-facing support contact, and the website that does not exist yet.
 *
 * ==============================  WHY THESE ARE SEPARATE  ==============================
 *
 * `SUPPORT_EMAIL` is live and monitored, so it is wired into the app as a tappable action.
 *
 * `PLANNED_SUPPORT_URL` is NOT wired into the app, and the constant exists mainly to record that
 * fact in one place. The domain currently answers every path -- /support, /privacy, /terms, and a
 * deliberately nonsense path -- with a byte-identical "Coming Soon" construction page. It returns
 * HTTP 200, which is exactly what makes it dangerous: a link check that only looks at the status
 * code would call it live, ship a link to a construction page, and the failure would surface as an
 * App Store rejection or a consumer who could not get help.
 *
 * So the rule is `SUPPORT_URL_IS_LIVE`, and it is false. Nothing renders a link to the website while
 * it is false. Flipping it to true is a deliberate act that should follow someone loading the page
 * and seeing an actual support page.
 */

/** Monitored. Safe to show a consumer. */
export const SUPPORT_EMAIL = 'info@pinnaclecapitalusa.com';

/** Planned. Recorded for the App Store worksheet and the website plan -- not linked from the app. */
export const PLANNED_SUPPORT_URL = 'https://pinnaclecapitalusa.com/support';

/**
 * Whether the planned public support page actually serves a support page.
 *
 * Verified by request, not assumed: as of 2026-08-20 the domain serves one "Coming Soon" page for
 * every path. Until that changes this stays false and the app links nothing.
 */
export const SUPPORT_URL_IS_LIVE = false;

/** A mailto with a subject, so an incoming message arrives already labelled as coming from the app. */
export function supportMailto(subject: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
