/**
 * Dispute items and the current round. Placeholder state only -- no API yet.
 */

/** The badge on each row. */
export type DisputeStatus = 'In Dispute' | 'Pending' | 'Received';

/**
 * Which filter tab an item belongs to. Deliberately separate from
 * `DisputeStatus`: a Received item is still part of the in-progress round until
 * the round itself closes, which is why the reference shows one under the
 * "In Progress" tab.
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

export const disputeFilters = ['In Progress', 'Completed', 'Deleted'] as const;
export type DisputeFilter = (typeof disputeFilters)[number];

export const currentRound = {
  round: 2,
  status: 'In Progress',
  completed: 3,
  total: 7,
};

export const disputeItems: DisputeItem[] = [
  {
    id: 'collection-lvnv',
    name: 'Collection Account',
    creditor: 'LVNV Funding LLC',
    bureau: 'Equifax',
    added: 'Jun 12, 2024',
    status: 'In Dispute',
    bucket: 'in-progress',
  },
  {
    id: 'chargeoff-capone',
    name: 'Charge Off',
    creditor: 'Capital One',
    bureau: 'Experian',
    added: 'Jun 14, 2024',
    status: 'In Dispute',
    bucket: 'in-progress',
  },
  {
    id: 'late-citi',
    name: 'Late Payment',
    creditor: 'Citi Bank',
    bureau: 'TransUnion',
    added: 'Jun 15, 2024',
    status: 'Pending',
    bucket: 'in-progress',
  },
  {
    id: 'medical-medone',
    name: 'Medical Collection',
    creditor: 'Med One',
    bureau: 'Equifax',
    added: 'Jun 16, 2024',
    status: 'Received',
    bucket: 'in-progress',
  },
];
