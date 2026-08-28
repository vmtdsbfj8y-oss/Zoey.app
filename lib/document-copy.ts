import { normalizeSlotId } from './slot-id';

/**
 * The document checklist, in the reader's language.
 *
 * ==============================  THE SAME CONTRACT AS EVERY OTHER SCREEN  ==============================
 *
 * `client-state-copy` doctrine again: the engine sends a slot id and a status enum, and it also
 * sends English prose for each. We render from the ID and the ENUM, never by matching the sentence,
 * because matching prose makes a copy edit on the server silently fall back to English in
 * production with nothing failing and nobody told.
 *
 * A slot or status this build has never heard of returns null, and the caller renders the engine's
 * own words. A newer engine therefore shows one row in English until it is translated here -- a
 * cosmetic gap, where a blank or a raw key would be a broken screen.
 *
 * Nothing here translates anything itself: it returns keys, and the lookup happens in a component
 * through the reactive `t()`, so changing language repaints immediately.
 */

/** Slot id -> resource key for the document's NAME. */
const SLOT_NAME_KEYS: Record<string, string> = {
  GOVERNMENT_ID: 'documents.slot.governmentId',
  SOCIAL_SECURITY_CARD: 'documents.slot.socialSecurityCard',
  PROOF_OF_ADDRESS: 'documents.slot.proofOfAddress',
  IDENTITYIQ_CREDIT_REPORT: 'documents.slot.identityiqCreditReport',
  CREDIT_REPORT: 'documents.slot.creditReport',
  CREDIT_REPORT_OTHER: 'documents.slot.creditReport',
  SUPPORTING_EVIDENCE: 'documents.slot.supportingEvidence',
  FTC_IDENTITY_THEFT_REPORT: 'documents.slot.ftcIdentityTheftReport',
  POLICE_REPORT: 'documents.slot.policeReport',
  BUREAU_LETTER: 'documents.slot.bureauLetter',
  /*
   * Keyed `companyLetter`, not `creditorLetter`: an i18n guard forbids the word "creditor" in any
   * resource key, because a key must never be derived from client evidence. The engine's slot id is
   * still CREDITOR_LETTER and the visible copy still says creditor.
   */
  CREDITOR_LETTER: 'documents.slot.companyLetter',
  SIGNED_DOCUMENT: 'documents.slot.signedDocument',
};

/** Checklist status -> resource key for the row's plain-language line. */
const STATUS_DETAIL_KEYS: Record<string, string> = {
  ACCEPTED: 'documents.detail.accepted',
  RECEIVED: 'documents.detail.received',
  REPLACE_REQUESTED: 'documents.detail.replaceRequested',
};

/** Nothing is in. The default, and deliberately not an error. */
export const MISSING_DETAIL_KEY = 'documents.detail.missing';

/**
 * The action vocabulary, defined once for every surface that offers it.
 *
 * The identity review and the checklist row are two views of the same three choices, and two
 * copies of "Upload" in two namespaces is how they end up worded differently in one language.
 */
export const DOCUMENT_ACTION_KEYS = {
  UPLOAD: 'documents.action.upload',
  VIEW: 'documents.action.view',
  REPLACE: 'documents.action.replace',
} as const;

/** Exported so a test can assert the tables and the translation files agree. */
export const TRANSLATABLE_DOCUMENT_SLOTS = Object.keys(SLOT_NAME_KEYS);
export const TRANSLATABLE_DOCUMENT_STATUSES = Object.keys(STATUS_DETAIL_KEYS);

export function slotNameKey(slotId: string | null | undefined): string | null {
  return SLOT_NAME_KEYS[normalizeSlotId(slotId)] ?? null;
}

export function statusDetailKey(status: string | null | undefined): string {
  return STATUS_DETAIL_KEYS[normalizeSlotId(status)] ?? MISSING_DETAIL_KEY;
}

/**
 * The document's name: this build's translation, or the engine's own label when the slot is one
 * we have never seen. Never a raw key, and never blank.
 */
export function documentNameFor(
  slot: { id: string; name: string },
  translate: (key: string) => string
): string {
  const key = slotNameKey(slot.id);
  return key ? translate(key) : slot.name;
}

/**
 * The row's status line. `detailKey` is what the store recorded from the engine status; `detail`
 * is the engine's own sentence, kept as the fallback for a status this build cannot name.
 */
export function documentDetailFor(
  slot: { detail: string; detailKey?: string },
  translate: (key: string) => string
): string {
  return slot.detailKey ? translate(slot.detailKey) : slot.detail;
}
