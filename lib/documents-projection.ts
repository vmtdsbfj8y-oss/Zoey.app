import { statusDetailKey } from './document-copy';
import type { DocumentSlot } from './documents-data';
import type { MobileOverview } from './mobile-api';

/**
 * The engine's checklist, as rows -- and the counting rules every surface must share.
 *
 * Pure and free of React and React Native on purpose, in the same spirit as
 * `interview-presentation` and `mobile-api-state`: this is the part of the Documents store that
 * makes DECISIONS, and decisions should be executable in a test without a renderer, a session or
 * a device. It lived inside `documents-store.tsx`, which is JSX, so nothing could reach it.
 *
 * That mattered. The Dashboard gauge and the Documents checklist disagreed about how many
 * documents a client had sent, and no test could have caught it, because the only place the rule
 * existed was inside a component tree.
 */

/** Checklist status -> the row's plain-language line. Superseded by `detailKey`; kept as the fallback. */
export function detailFor(status: string): string {
  switch (status) {
    case 'ACCEPTED':
      return 'Accepted';
    case 'RECEIVED':
      return 'Received — being reviewed';
    case 'REPLACE_REQUESTED':
      return 'Another copy needed';
    default:
      return 'Not uploaded yet';
  }
}

/** The engine's checklist, as rows. Slot ids are the engine's and are never rewritten. */
export function slotsFromOverview(overview: MobileOverview | null): DocumentSlot[] {
  if (!overview) return [];
  return overview.intake.checklist.map((item) => ({
    id: item.slot,
    name: item.label,
    /*
     * ONLY 'ACCEPTED' counts as done. RECEIVED means the file is in and the requirement is still
     * unmet, which is exactly the case that left a green tick above a disabled Start Zoey.
     */
    state: item.status === 'ACCEPTED' ? 'uploaded' : 'pending',
    review: item.status === 'RECEIVED',
    /*
     * Surfaced so a caller can offer "Replace" rather than "Upload" -- the one outstanding status
     * where the consumer HAS sent something and still has something to do. `state` still reads
     * 'pending', so every row that ignores this flag behaves exactly as it did before.
     */
    replaceRequested: item.status === 'REPLACE_REQUESTED',
    kind: 'uploaded',
    detail: detailFor(item.status),
    // The key the row renders from, so the line follows the reader's language rather than the
    // language this string happened to be built in.
    detailKey: statusDetailKey(item.status),
    // The engine's flag, not a local list. Supporting evidence is optional, and an optional row
    // outstanding must never read as something the client has failed to do.
    optional: item.required === false,
  }));
}

/**
 * How many documents are actually IN.
 *
 * The one definition, shared, because there used to be two. The Dashboard gauge inferred it as
 * `total - missing.length`, and `missing` is what the client still OWES -- required only, optional
 * excluded -- so every optional slot was subtracted as though it had arrived. A client who had
 * sent nothing was told "2 of 7 received".
 *
 * In means any status other than MISSING: accepted, under review, or in with a replacement asked
 * for. That is the engine's own rule, so a count taken here and a count taken there agree.
 */
export function receivedCount(slots: DocumentSlot[]): number {
  return slots.filter((slot) => slot.state === 'uploaded' || slot.review || slot.replaceRequested).length;
}

/** What the client still has to SEND. A document under review is not owed by them. */
export function missingSlots(slots: DocumentSlot[]): DocumentSlot[] {
  return slots.filter((slot) => slot.state === 'pending' && !slot.optional && !slot.review);
}
