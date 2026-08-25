/**
 * The client state, in the reader's language.
 *
 * ==============================  WHAT THE ENGINE ACTUALLY SENDS  ==============================
 *
 * `/api/mobile/results` resolves ONE client-facing state from backend truth and returns it as a
 * closed enum -- `CLIENT_QUESTIONS_REQUIRED`, `READY_TO_SIGN`, `OWNER_REVIEW`, and four more --
 * together with an English `headline` and `detail`.
 *
 * Those two strings are NOT generated. On the engine they are a static lookup keyed by that same
 * enum: seven fixed pairs, no interpolation, no model output, and not one byte of client data in
 * them. No creditor, no bureau, no account, no amount, no date. They are product copy that happens
 * to travel over the wire.
 *
 * ==============================  WHY THE KEY AND NOT THE SENTENCE  ==============================
 *
 * So a Spanish reader was getting Spanish chrome around an English headline. There were three ways
 * to fix it and only one of them is sound:
 *
 *   - Match the English sentence on the device and swap it. This is the tempting one and it is the
 *     worst: it makes a copy edit on the server -- a comma, a capital -- silently fall back to
 *     English in production, with nothing failing and nobody told.
 *   - Have the engine return localised prose. Legitimate, but it moves a presentation concern into
 *     a service that has no idea who is reading, needs a locale on every request, and ships a second
 *     copy of the Spanish that then has to be kept in step with this one.
 *   - Render from the enum the engine ALREADY sends. The state name is the semantic key. It is
 *     stable, it is the same value the screens already branch on, and translating it is a lookup.
 *
 * This module is the third. It maps state -> resource key and translates NOTHING itself, so the
 * lookup happens in a component through the reactive `t()` -- the runtime mirror is one render stale
 * after a language change, which is exactly the bug this is meant to fix.
 *
 * ==============================  THE FALLBACK IS THE ENGINE'S OWN WORDS  ==============================
 *
 * An unknown state returns null and the caller renders the `headline`/`detail` the engine sent. When
 * the engine grows an eighth state, a Spanish reader sees that one line in English until it is
 * translated here -- which is a cosmetic gap, where a blank or a raw key would be a broken screen.
 */

/** State name -> the resource keys that carry its copy. Nothing else may key off these strings. */
const KEYS: Record<string, { headline: string; detail: string }> = {
  CLIENT_QUESTIONS_REQUIRED: {
    headline: 'insight.questionsRequired.headline',
    detail: 'insight.questionsRequired.detail',
  },
  DOCUMENTS_HELD: {
    headline: 'insight.documentsHeld.headline',
    detail: 'insight.documentsHeld.detail',
  },
  READY_TO_SIGN: {
    headline: 'insight.readyToSign.headline',
    detail: 'insight.readyToSign.detail',
  },
  SIGNED_WAITING_OWNER: {
    headline: 'insight.signedWaitingOwner.headline',
    detail: 'insight.signedWaitingOwner.detail',
  },
  OWNER_REVIEW: {
    headline: 'insight.ownerReview.headline',
    detail: 'insight.ownerReview.detail',
  },
  ZOEY_WORKING: {
    headline: 'insight.zoeyWorking.headline',
    detail: 'insight.zoeyWorking.detail',
  },
  NOTHING_REQUIRED: {
    headline: 'insight.nothingRequired.headline',
    detail: 'insight.nothingRequired.detail',
  },
};

/** Every state this app can translate. Exported so a test can assert the tables agree. */
export const TRANSLATABLE_CLIENT_STATES = Object.keys(KEYS);

export interface ClientStateCopy {
  headline: string;
  detail: string;
}

/** The resource keys for a state, or null when the engine sends one this build does not know. */
export function clientStateKeys(state: string | undefined | null): ClientStateCopy | null {
  if (!state) return null;
  return KEYS[state] ?? null;
}

/**
 * Resolve the copy for a client state.
 *
 * `translate` is the caller's own `t` from `useI18n()`, so this stays a pure function and the
 * reactivity belongs to the component that rendered it.
 */
export function clientStateCopy(
  /*
   * `state` is a plain string, deliberately, not the union from `mobile-results`. The whole point of
   * the fallback is the state this build has never heard of -- typing it as the union would make
   * that case unrepresentable and the fallback dead code.
   */
  view: { state: string; headline: string; detail: string } | null | undefined,
  translate: (key: string) => string
): ClientStateCopy | null {
  if (!view) return null;
  const keys = clientStateKeys(view.state);
  if (!keys) return { headline: view.headline, detail: view.detail };
  return { headline: translate(keys.headline), detail: translate(keys.detail) };
}
