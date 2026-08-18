/**
 * Shapes for the document rows.
 *
 * The rows themselves are NOT defined here any more. They come from the engine's intake checklist
 * (see `slotsFromOverview`), because a local list is a second opinion about what Zoey requires and
 * the copy is what goes stale. What remains is the type the rows conform to and the upload limits
 * the UI quotes.
 */

export type DocState = 'uploaded' | 'pending';
/** `generated` = produced by Zoey (dispute letters etc), not uploaded by the client. */
export type DocKind = 'uploaded' | 'generated';

export type DocumentSlot = {
  id: string;
  name: string;
  state: DocState;
  kind: DocKind;
  /** Shown under the name: when it landed, or what's still needed. */
  detail: string;
  /** Hard requirement rendered as a prominent badge, not helper text. */
  requirement?: string;
  optional?: boolean;
};



export const uploadLimits = {
  formats: 'PDF, JPG, PNG',
  maxSize: 'Max 25MB',
};
