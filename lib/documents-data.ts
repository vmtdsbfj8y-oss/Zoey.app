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
  /** Shown under the name: when it landed, or what's still needed. The engine's own words. */
  detail: string;
  /**
   * Resource key for `detail`, derived from the engine's status enum.
   *
   * Rendered in preference to `detail` so the line follows the reader's language. `detail` stays
   * as the fallback for a status this build has never heard of.
   */
  detailKey?: string;
  /**
   * Received, but NOT yet accepted.
   *
   * Distinct from both states on purpose. Collapsing it into "uploaded" is what let a row show a
   * green check while the requirement behind it was still unmet -- and collapsing it into
   * "pending" invites the client to send a file again when there is nothing for them to do.
   */
  review?: boolean;
  /** Hard requirement rendered as a prominent badge, not helper text. */
  requirement?: string;
  optional?: boolean;
  /**
   * The engine asked for another copy (`REPLACE_REQUESTED`).
   *
   * Kept as its own flag rather than folded into `state`, because it is the one outstanding status
   * where the consumer HAS sent something and still has something to do. `state` collapses it to
   * 'pending' so every existing row keeps behaving exactly as before; only callers that ask for
   * this flag can tell the difference.
   */
  replaceRequested?: boolean;
};



/**
 * THE FALLBACK, NOT THE AUTHORITY.
 *
 * `maxSize` said "Max 25MB" while the engine enforced a different number and Vercel refused the
 * request body at about 4.5 MB before either got a say -- so a person photographing an ID at full
 * resolution got a bare platform error with no Zoey wording anywhere in it.
 *
 * The engine has always served the real figure as `limits.maxUploadBytes`; nothing rendered it.
 * `MAX_UPLOAD_BYTES` here is only what to believe before the first overview arrives, and it is
 * deliberately the conservative value rather than an optimistic one: being wrong low costs somebody
 * a retry with a smaller file, being wrong high costs them a failure they cannot interpret.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const uploadLimits = {
  formats: 'PDF, JPG, PNG',
  maxSize: `Max ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB`,
};

/** The sentence shown for a file that is too big. One phrasing, wherever it is needed. */
export function tooLargeMessage(label: string): string {
  return `This file is too large. Choose a file under ${label}.`;
}
