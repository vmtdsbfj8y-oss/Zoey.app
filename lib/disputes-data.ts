/**
 * Dispute vocabulary and record shapes.
 *
 * THE FABRICATED DATA THAT USED TO LIVE HERE IS GONE. This file previously
 * exported `disputeItems` -- four invented derogatories against named creditors
 * (LVNV Funding, Capital One, Citi Bank, Med One), with invented bureaus and
 * dates -- and `currentRound` ("Round 2 / In Progress / 3 of 7 completed").
 * Both rendered to every member of an app that has no dispute endpoint at all,
 * so neither could ever have been true of anyone. The file's own header already
 * said "Placeholder state only -- no API yet".
 *
 * What remains is vocabulary and types: the filter tab labels, and the shape a
 * real dispute record will take when one is connected. There is deliberately
 * no exported VALUE here that can be rendered, so a placeholder cannot be
 * reintroduced by importing this module.
 */

/** The badge on each row. */
export type DisputeStatus = 'In Dispute' | 'Pending' | 'Received';

/**
 * Which filter tab an item belongs to. Deliberately separate from
 * `DisputeStatus`: a Received item is still part of the in-progress round until
 * the round itself closes, which is why one can appear under "In Progress".
 */
export type DisputeBucket = 'in-progress' | 'completed' | 'deleted';

export type DisputeItem = {
  id: string;
  /** The derogatory being disputed. */
  name: string;
  /** Who reported it. */
  creditor: string;
  bureau: string;
  added: string;
  status: DisputeStatus;
  bucket: DisputeBucket;
};

/** Tab labels. UI vocabulary, not data. */
export const disputeFilters = ['In Progress', 'Completed', 'Deleted'] as const;
export type DisputeFilter = (typeof disputeFilters)[number];
