import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { receivedCount, slotsFromOverview } from '../documents-projection';
import type { MobileOverview } from '../mobile-api';

/**
 * One consumer, one overview, one answer.
 *
 * The bug this locks out: the Dashboard gauge computed "received" as `total - missing.length`,
 * and `missing` is deliberately what the client still OWES -- required only, optional excluded.
 * Every optional slot was therefore subtracted as though it had arrived. With five required and
 * two optional slots all outstanding, the Dashboard said "2 of 7 received" while the Documents
 * screen -- reading the SAME store and the SAME response -- correctly showed all seven as
 * "Not uploaded yet".
 *
 * It looked for a while like two data sources or two client files. It was neither: instrumenting
 * every overview fetch showed one host and one identical payload (7 slots, all MISSING) for every
 * surface. The contradiction was arithmetic, not plumbing.
 *
 * So these assertions are about agreement: whatever the checklist says, every surface that counts
 * it must reach the same number as the engine's own rule, which is "anything not MISSING".
 */

type ChecklistItem = MobileOverview['intake']['checklist'][number];

const overviewWith = (items: ChecklistItem[]): MobileOverview =>
  ({ intake: { checklist: items }, analysis: { state: 'NOT_STARTED' } }) as unknown as MobileOverview;

const slot = (
  s: string,
  status: ChecklistItem['status'],
  required = true
): ChecklistItem => ({ slot: s, label: s, status, required });

/** The engine's own rule, and the one `app/(tabs)/index.tsx` already uses. */
const engineReceivedCount = (items: ChecklistItem[]) => items.filter((i) => i.status !== 'MISSING').length;

/** What the gauge now computes, expressed over the same rows. */
const gaugeReceivedCount = (items: ChecklistItem[]) => receivedCount(slotsFromOverview(overviewWith(items)));

describe('the Dashboard gauge and the Documents checklist cannot disagree', () => {
  it('counts nothing received when nothing has been sent, optional slots included', () => {
    // The exact shape that produced "2 of 7": five required outstanding, two optional outstanding.
    const items = [
      slot('GOVERNMENT_ID', 'MISSING'),
      slot('SOCIAL_SECURITY_CARD', 'MISSING'),
      slot('PROOF_OF_ADDRESS', 'MISSING'),
      slot('IDENTITYIQ_CREDIT_REPORT', 'MISSING'),
      slot('FTC_IDENTITY_THEFT_REPORT', 'MISSING'),
      slot('SUPPORTING_EVIDENCE', 'MISSING', false),
      slot('POLICE_REPORT', 'MISSING', false),
    ];
    expect(gaugeReceivedCount(items)).toBe(0);
    expect(gaugeReceivedCount(items)).toBe(engineReceivedCount(items));

    // And the checklist agrees: every row reads as not-yet-uploaded.
    const rows = slotsFromOverview(overviewWith(items));
    expect(rows.every((r) => r.state === 'pending' && !r.review && !r.replaceRequested)).toBe(true);
  });

  it('never counts an optional slot as received just because it is optional', () => {
    const items = [slot('GOVERNMENT_ID', 'MISSING'), slot('POLICE_REPORT', 'MISSING', false)];
    expect(gaugeReceivedCount(items)).toBe(0);
  });

  it('counts every status that means something is actually in', () => {
    const items = [
      slot('GOVERNMENT_ID', 'ACCEPTED'),
      slot('PROOF_OF_ADDRESS', 'RECEIVED'),
      slot('SOCIAL_SECURITY_CARD', 'REPLACE_REQUESTED'),
      slot('FTC_IDENTITY_THEFT_REPORT', 'MISSING'),
      slot('POLICE_REPORT', 'MISSING', false),
    ];
    expect(gaugeReceivedCount(items)).toBe(3);
    expect(gaugeReceivedCount(items)).toBe(engineReceivedCount(items));
  });

  it('agrees with the engine across every mix of statuses and requirement levels', () => {
    const statuses: ChecklistItem['status'][] = ['MISSING', 'RECEIVED', 'ACCEPTED', 'REPLACE_REQUESTED'];
    for (const a of statuses) {
      for (const b of statuses) {
        for (const required of [true, false]) {
          const items = [slot('A', a), slot('B', b, required)];
          expect(`${a}/${b}/${required}:${gaugeReceivedCount(items)}`).toBe(
            `${a}/${b}/${required}:${engineReceivedCount(items)}`
          );
        }
      }
    }
  });

  it('never exceeds the total, and stays at zero for an empty checklist', () => {
    expect(gaugeReceivedCount([])).toBe(0);
    const all = [slot('A', 'ACCEPTED'), slot('B', 'ACCEPTED', false)];
    expect(gaugeReceivedCount(all)).toBe(2);
  });
});

/** Comments explain the old bug by quoting it, so assertions about CODE must not read prose. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('the gauge no longer derives received from what is owed', () => {
  const CARD = readFileSync(
    new URL('../../components/home/progress-gauge-card.tsx', import.meta.url).pathname,
    'utf8'
  );
  const CODE = stripComments(CARD);

  it('does not subtract the required-only `missing` list', () => {
    expect(CODE.includes('total - missing.length')).toBe(false);
    // It calls the one shared rule rather than carrying a second copy of it.
    expect(CODE).toContain('receivedCount(slots)');
  });

  it('no longer pulls `missing` at all, so it cannot drift back', () => {
    // If a later change wants it again, that is a deliberate act rather than an inherited habit.
    expect(/const \{[^}]*\bmissing\b[^}]*\} = useDocuments\(\)/.test(CODE)).toBe(false);
  });
});

describe('the ring does not divide by an empty checklist', () => {
  const CARD = readFileSync(
    new URL('../../components/home/progress-gauge-card.tsx', import.meta.url).pathname,
    'utf8'
  );

  const CODE = stripComments(CARD);

  it('guards the divide it always claimed to guard', () => {
    /*
     * `total` is 0 until the first overview lands, and the ring was handed `received / total`
     * directly -- NaN, which reaches stroke-dashoffset and renders nothing at all. The comment
     * above it had described a guard that was never written.
     */
    expect(CODE.includes('progress={received / total}')).toBe(false);
    expect(CODE).toContain('total > 0 ? received / total : 0');
  });
});
