import { DOCUMENT_ACTION_KEYS } from './document-copy';
import type { DocumentSlot } from './documents-data';
import type { InterviewEvidenceNeed } from './mobile-interview';

/**
 * Joining what the case NEEDS to what the checklist HAS.
 *
 * ==============================  TWO SERVER LISTS, ONE ROW  ==============================
 *
 * The interview's `evidenceNeeds` say which documents the confirmed answers now call for, and at
 * what level. The intake checklist says what has actually been received for each slot. Neither
 * knows about the other, and both are the engine's -- so this module is the join, keyed on the
 * engine's own slot id, and it invents neither side.
 *
 * ==============================  ONLY STATUSES THE APP REALLY HAS  ==============================
 *
 * The action comes from the checklist status the overview genuinely carries:
 *
 *   ACCEPTED           -> VIEW     the requirement is met; there is something to look at
 *   REPLACE_REQUESTED  -> REPLACE  a copy is in and another one is wanted
 *   RECEIVED           -> VIEW     in and being reviewed; nothing for the consumer to redo
 *   anything else      -> UPLOAD   nothing is in
 *
 * Nothing here fabricates a status the API does not send. A need whose slot is absent from the
 * checklist resolves to UPLOAD, which is the honest reading: the engine is asking for a document
 * and we have no record of one.
 */

export type EvidenceAction = 'UPLOAD' | 'VIEW' | 'REPLACE';

/** Slot ids are the engine's. Compared case-insensitively so a casing drift cannot orphan a row. */
export function normalizeSlotId(slotId: string | null | undefined): string {
  return String(slotId ?? '').trim().toUpperCase();
}

/** The checklist row for one evidence need, or undefined when the checklist has no such slot. */
export function slotForEvidence(
  slots: DocumentSlot[],
  need: Pick<InterviewEvidenceNeed, 'slot'> | { slot: string }
): DocumentSlot | undefined {
  const wanted = normalizeSlotId(need.slot);
  if (!wanted) return undefined;
  return slots.find((slot) => normalizeSlotId(slot.id) === wanted);
}

/**
 * Which action this row offers.
 *
 * Precedence matters: an accepted document is VIEW even if something else is also true, and a
 * requested replacement outranks "received", because the consumer has something to do about the
 * first and nothing to do about the second.
 */
export function actionForSlot(slot: DocumentSlot | undefined): EvidenceAction {
  if (!slot) return 'UPLOAD';
  if (slot.state === 'uploaded') return 'VIEW';
  if (slot.replaceRequested) return 'REPLACE';
  if (slot.review) return 'VIEW';
  return 'UPLOAD';
}

/**
 * Resource key for the action's button label.
 *
 * The shared document vocabulary, not a second copy: the review card and the checklist row are two
 * views of the same three choices, and two sets of translations is how they end up worded
 * differently in one language and not the other.
 */
export function actionLabelKey(action: EvidenceAction): string {
  return DOCUMENT_ACTION_KEYS[action];
}

/**
 * The one shape the evidence list renders, and the one the Documents screen is navigated with.
 * `documentType` is the engine's slot id, passed through untouched -- the app never invents an id.
 */
export interface EvidenceRow {
  documentType: string;
  action: EvidenceAction;
  requirement: InterviewEvidenceNeed['requirement'];
  reason: string;
  slot: DocumentSlot | undefined;
}

export function evidenceRows(
  needs: Pick<InterviewEvidenceNeed, 'slot' | 'requirement' | 'reason'>[],
  slots: DocumentSlot[]
): EvidenceRow[] {
  return needs.map((need) => {
    const slot = slotForEvidence(slots, need);
    return {
      documentType: need.slot,
      action: actionForSlot(slot),
      // The server's level, rendered as sent. Never promoted, never demoted.
      requirement: need.requirement,
      reason: need.reason,
      slot,
    };
  });
}
