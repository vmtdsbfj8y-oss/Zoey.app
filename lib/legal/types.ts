/**
 * The shape of Zoey's consumer-facing legal and privacy documents.
 *
 * ==============================  WHY THIS IS DATA  ==============================
 *
 * These documents are structured values rather than JSX for three reasons that all turned out to
 * matter more than the convenience of writing them inline.
 *
 * They have to be TESTABLE. "No screen promises a guaranteed deletion" and "the privacy notice does
 * not claim data is never shared" are assertions about prose, and prose that only exists inside a
 * render tree can only be checked by rendering it. As data, a test reads the sentences directly.
 *
 * They have to be VERSIONED. A consumer who accepted something is entitled to know what they
 * accepted, which means the accepted thing needs an identifier that does not change when the
 * wording is edited. `version` is that identifier and it is stored with the acceptance.
 *
 * They have to be PUBLISHABLE ELSEWHERE. The Privacy Policy and Terms must eventually exist at
 * public web URLs -- an app-store reviewer, and anyone who has not installed the app, has to be able
 * to read them without signing in. One source of truth here means the website renders the same
 * words the app shows, instead of a second copy that drifts.
 */

/** Stable ids. Used in routes, in acceptance records and as test anchors, so they do not change. */
export type LegalDocumentId =
  | 'privacy'
  | 'terms'
  | 'ai-disclosure'
  | 'credit-information'
  | 'dispute-services'
  | 'data-choices'
  | 'account-deletion'
  | 'contact';

/**
 * Publication status, shown to the reader.
 *
 * `DRAFT_PENDING_COUNSEL` is not a hedge for its own sake. These documents were drafted from the
 * implementation, not from a template, and the parts that require a lawyer's judgement -- liability,
 * governing law, dispute resolution, state-specific privacy rights -- have deliberately NOT been
 * invented here. Telling the reader that is more honest than presenting an unreviewed draft as
 * settled policy, and the banner disappears the moment counsel signs off.
 */
export type LegalStatus = 'DRAFT_PENDING_COUNSEL' | 'PUBLISHED';

export interface LegalSection {
  heading: string;
  /** Paragraphs. Rendered verbatim, in order, never summarised or re-generated. */
  body: string[];
  /**
   * An email address this section offers as a way to get in touch.
   *
   * Separate from `body` so the address is an ACTION rather than a sentence. An email written into
   * prose on a phone is a string you have to select, copy without catching the punctuation, and
   * paste into another app; as a field it renders as a tappable mailto row, and a test can assert
   * which sections actually offer a contact path rather than grepping paragraphs for an @ sign.
   *
   * Only ever a monitored, consumer-facing address. Never an internal, admin or personal one.
   */
  contactEmail?: string;
  /**
   * Present when this specific section is a placeholder awaiting a decision only a lawyer or the
   * company can make. Rendered visibly, because an invisible gap is the one that ships.
   */
  counselNote?: string;
}

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  /** One line, shown in the Legal & Privacy list. */
  summary: string;
  /**
   * Identifier for this exact wording. Bump on any substantive change. Stored alongside a consumer's
   * acceptance so "what did they agree to" has an answer that survives later edits.
   */
  version: string;
  /** ISO date the version took effect. */
  effective: string;
  status: LegalStatus;
  /**
   * Whether this document must ALSO exist at a public web URL before App Store submission.
   *
   * True for the ones a reviewer or a non-user must be able to read without an account. Recorded
   * here so the website requirement is derived from the documents themselves rather than from
   * somebody remembering.
   */
  requiresPublicUrl: boolean;
  sections: LegalSection[];
}
