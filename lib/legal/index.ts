import { AI_DISCLOSURE, CREDIT_INFORMATION_DISCLAIMER, DISPUTE_SERVICES_DISCLOSURE } from './disclosures';
import { ACCOUNT_DELETION, CONTACT_SUPPORT, DATA_CHOICES } from './operational';
import { PRIVACY_POLICY } from './privacy';
import { TERMS_OF_USE } from './terms';
import type { LegalDocument, LegalDocumentId } from './types';

export type { LegalDocument, LegalDocumentId, LegalSection, LegalStatus } from './types';

/**
 * The registry. Order is the order they appear in Legal & Privacy, which is not alphabetical --
 * Privacy Policy and Terms first because those are the two people look for, then the disclosures
 * that explain what Zoey is, then the two pages that are about doing something.
 */
export const LEGAL_DOCUMENTS: LegalDocument[] = [
  PRIVACY_POLICY,
  TERMS_OF_USE,
  AI_DISCLOSURE,
  CREDIT_INFORMATION_DISCLAIMER,
  DISPUTE_SERVICES_DISCLOSURE,
  DATA_CHOICES,
  ACCOUNT_DELETION,
  CONTACT_SUPPORT,
];

export function legalDocument(id: LegalDocumentId): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.id === id);
}

/** Documents that must also live at a public web URL before the app can be submitted. */
export function documentsRequiringPublicUrl(): LegalDocument[] {
  return LEGAL_DOCUMENTS.filter((doc) => doc.requiresPublicUrl);
}

/**
 * Every open question a lawyer or the company has to answer, gathered from the documents themselves.
 *
 * Derived rather than maintained as a separate list, because a hand-kept list of "things still to
 * review" is exactly the artefact that goes stale first. Delete a `counselNote` and the item leaves
 * this list; add one and it appears. The Legal & Privacy screen shows the count, so an unresolved
 * item is visible rather than filed away.
 */
export interface CounselReviewItem {
  documentId: LegalDocumentId;
  documentTitle: string;
  section: string;
  note: string;
}

export function counselReviewItems(): CounselReviewItem[] {
  return LEGAL_DOCUMENTS.flatMap((doc) =>
    doc.sections
      .filter((section) => section.counselNote)
      .map((section) => ({
        documentId: doc.id,
        documentTitle: doc.title,
        section: section.heading,
        note: section.counselNote as string,
      }))
  );
}

/**
 * The documents a consumer affirmatively accepts when they create an account.
 *
 * Two, not eight. Every document is reachable and readable, but asking someone to tick a box for
 * each one produces consent theatre -- a column of checkboxes nobody reads, which is weaker evidence
 * of agreement than a single acknowledgement that names what it covers. The Terms incorporate the
 * disclosures by reference, and the disclosures are one tap away from the acknowledgement itself.
 */
export const SIGNUP_ACCEPTED_DOCUMENTS: LegalDocumentId[] = ['terms', 'privacy'];

/** What gets recorded when someone accepts. Stored per account, alongside who and when. */
export interface LegalAcceptanceRecord {
  documentId: LegalDocumentId;
  version: string;
  acceptedAt: number;
}

/**
 * Builds the acceptance records for a signup, stamping the versions in force at that moment.
 *
 * The version matters more than the timestamp. "Accepted the Terms on 20 August" is not an answer
 * to "what did they agree to" once the Terms have been edited twice since; `terms-2026-08-20` is.
 */
export function signupAcceptance(now: number): LegalAcceptanceRecord[] {
  return SIGNUP_ACCEPTED_DOCUMENTS.map((id) => {
    const doc = legalDocument(id);
    if (!doc) throw new Error(`Unknown legal document in signup acceptance: ${id}`);
    return { documentId: id, version: doc.version, acceptedAt: now };
  });
}

/**
 * Whether a stored acceptance still covers the current version of a document.
 *
 * Used to decide whether to re-ask. Not wired to a blocking gate: a version bump should prompt an
 * acknowledgement, not lock somebody out of their own credit records.
 */
export function acceptanceIsCurrent(record: LegalAcceptanceRecord): boolean {
  const doc = legalDocument(record.documentId);
  return !!doc && doc.version === record.version;
}
