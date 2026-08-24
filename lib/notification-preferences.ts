/**
 * Notification categories, and an honest account of what Zoey can currently do with them.
 *
 * ==============================  WHAT THE AUDIT FOUND  ==============================
 *
 * The toggles worked. They wrote through to `PATCH /api/profile`, which persists them per account
 * behind an authenticated session, so a preference set on one device is there on the next. That part
 * was never broken.
 *
 * What did not exist was everything downstream of the preference. No notification library is
 * installed. iOS permission is never requested. No push token is ever obtained or stored. There is
 * no delivery service, no server-side send path, and nothing that reads these preferences to decide
 * whether to send anything. A consumer enabling "Dispute updates" was storing an intention, not
 * subscribing to a notification -- and four confident switches are a strong claim that something
 * will arrive.
 *
 * ==============================  WHAT WAS DONE ABOUT IT  ==============================
 *
 * The preferences are kept and the claim is withdrawn. Delivery is `NOT_IMPLEMENTED` here, one
 * exported value, and the Settings screen renders from it: while delivery does not exist the section
 * says so before the switches rather than after them, and no OS permission is requested for messages
 * that cannot be sent. Asking for notification permission Zoey cannot honour would spend a consumer's
 * one-time iOS prompt on nothing.
 *
 * When a delivery path lands, `DELIVERY` becomes `AVAILABLE`, the permission model below starts
 * being consulted, and the preferences that were quietly accumulating are already there.
 */

/**
 * Whether Zoey can actually deliver a notification today.
 *
 * A single value rather than a scatter of `if (false)` branches, so the UI, the tests and any future
 * send path all read the same fact from the same place.
 */
export type DeliveryCapability = 'NOT_IMPLEMENTED' | 'AVAILABLE';

export const DELIVERY: DeliveryCapability = 'NOT_IMPLEMENTED';

export function deliveryIsLive(): boolean {
  return DELIVERY === 'AVAILABLE';
}

/** The stored preference keys. Mirrors the server allow-list in `api/profile.ts`. */
export type NotificationCategoryKey =
  | 'disputeUpdates'
  | 'documentRequests'
  | 'scoreChanges'
  | 'productNews';

export interface NotificationCategory {
  key: NotificationCategoryKey;
  /** Translation keys, not copy. The registry stays the source of truth for WHICH categories exist. */
  labelKey: string;
  detailKey: string;
  /**
   * Why this category exists as a product, not as a switch.
   *
   * Every category here corresponds to an event the system already produces and already surfaces
   * in-app. A category with no such event would be a promise of a message that nothing generates.
   */
  purpose: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: 'disputeUpdates',
    labelKey: 'notifications.disputeUpdates',
    detailKey: 'notifications.disputeUpdatesDetail',
    purpose: 'Bureau responses arrive on their own schedule and change what happens next.',
  },
  {
    key: 'documentRequests',
    labelKey: 'notifications.actionRequired',
    detailKey: 'notifications.actionRequiredDetail',
    purpose: 'A case stops until the consumer supplies something. This is the category that unblocks work.',
  },
  {
    key: 'scoreChanges',
    labelKey: 'notifications.creditReportUpdates',
    detailKey: 'notifications.creditReportUpdatesDetail',
    purpose: 'A newly parsed report changes the numbers the consumer is tracking.',
  },
  {
    key: 'productNews',
    labelKey: 'notifications.productNews',
    detailKey: 'notifications.productNewsDetail',
    purpose: 'Marketing and release news. Separated so turning it off never turns off case updates.',
  },
];

/**
 * The OS permission state, kept deliberately separate from the preferences above.
 *
 * These two are constantly conflated, and conflating them produces the most confusing possible
 * settings screen: a toggle that is on while the operating system silently discards every message,
 * or a toggle forced off because permission was denied, losing a preference the consumer expressed.
 *
 * They answer different questions. The OS permission is "will iOS let Zoey put a message on this
 * screen". The preference is "does this person want to hear about this kind of thing". Zoey needs a
 * yes to both, and it stores only the second.
 */
export type OsPermissionState = 'NOT_DETERMINED' | 'GRANTED' | 'DENIED' | 'UNAVAILABLE';

export interface NotificationStatus {
  delivery: DeliveryCapability;
  osPermission: OsPermissionState;
}

/**
 * Whether it is appropriate to ask iOS for notification permission right now.
 *
 * Three rules, all of which exist because of how the iOS prompt works: it can be shown once, a
 * denial can only be reversed in the Settings app, and re-asking after a denial is impossible rather
 * than merely annoying.
 *
 * So: never ask while there is nothing to deliver, never ask twice, and never nag after a denial.
 */
export function shouldRequestOsPermission(status: NotificationStatus): boolean {
  if (status.delivery !== 'AVAILABLE') return false;
  return status.osPermission === 'NOT_DETERMINED';
}

/**
 * What the consumer is told about the state of notifications overall.
 *
 * Returns null when there is nothing worth saying -- delivery works, permission is granted, and the
 * switches speak for themselves. Every non-null case is a state where a switch alone would mislead.
 */
export function notificationStatusKey(status: NotificationStatus): string | null {
  if (status.delivery !== 'AVAILABLE') return 'notifications.notDelivering';
  switch (status.osPermission) {
    case 'DENIED':
      return 'notifications.osDenied';
    case 'NOT_DETERMINED':
      return 'notifications.osNotDetermined';
    case 'UNAVAILABLE':
      return 'notifications.osUnavailable';
    case 'GRANTED':
      return null;
  }
}

/**
 * Whether the switches should still be operable in a given state.
 *
 * Always true, and that is the point. Disabling the switches when delivery or permission is missing
 * would throw away the one thing that still works -- recording what the person wants -- and would
 * make the screen look broken rather than honest. What changes with state is the explanation above
 * them, never the ability to express a preference.
 */
export function preferencesAreEditable(_status: NotificationStatus): boolean {
  return true;
}
