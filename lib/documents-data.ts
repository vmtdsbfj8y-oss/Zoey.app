/**
 * The real document slots the client has to fill. Placeholder state only --
 * no API yet.
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

export const documentSlots: DocumentSlot[] = [
  {
    id: 'ssn',
    name: 'SSN Card',
    state: 'uploaded',
    kind: 'uploaded',
    detail: 'Uploaded 5 days ago',
  },
  {
    id: 'photo-id',
    name: 'Photo ID',
    state: 'uploaded',
    kind: 'uploaded',
    detail: 'Uploaded 5 days ago',
  },
  {
    id: 'proof-address',
    name: 'Proof of Address',
    state: 'pending',
    kind: 'uploaded',
    detail: 'Utility bill or lease, dated within 90 days',
  },
  {
    id: 'credit-report',
    name: 'Credit Report',
    state: 'pending',
    kind: 'uploaded',
    detail: 'Reports from other providers cannot be accepted',
    requirement: 'IdentityIQ only',
  },
  {
    id: 'optional-extras',
    name: 'Optional Extras',
    state: 'pending',
    kind: 'uploaded',
    detail: 'Anything else that supports your case',
    optional: true,
  },
];

export const uploadLimits = {
  formats: 'PDF, JPG, PNG',
  maxSize: 'Max 25MB',
};
