import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { en } from '../i18n/en';
import { es } from '../i18n/es';
import {
  actionForSlot,
  actionLabelKey,
  evidenceRows,
  normalizeSlotId,
  slotForEvidence,
} from '../interview-evidence-actions';
import { sourcesForSlot, slotOffersPhotos } from '../upload-sources';
import type { DocumentSlot } from '../documents-data';

/**
 * The handoff from "Zoey needs this document" to "here is that document".
 *
 * The bug this covers: the completed review named four documents and then offered one generic
 * link, so a consumer who tapped it landed at the top of a list and had to find the row again.
 * Naming a thing and not taking somebody to it is the whole defect, and these tests pin the join
 * that fixes it -- including the part that must NOT happen, which is inventing a status or a
 * requirement level the server did not send.
 */

const slot = (over: Partial<DocumentSlot> & { id: string }): DocumentSlot => ({
  name: over.id,
  state: 'pending',
  kind: 'uploaded',
  detail: '',
  ...over,
});

const CHECKLIST: DocumentSlot[] = [
  slot({ id: 'FTC_IDENTITY_THEFT_REPORT' }),
  slot({ id: 'GOVERNMENT_ID', state: 'uploaded' }),
  slot({ id: 'PROOF_OF_ADDRESS', review: true }),
  slot({ id: 'POLICE_REPORT', replaceRequested: true }),
];

// The engine's set for the synthetic identity-theft case. Rendered dynamically, never hardcoded.
const NEEDS = [
  { slot: 'FTC_IDENTITY_THEFT_REPORT', requirement: 'REQUIRED' as const, reason: 'r1' },
  { slot: 'GOVERNMENT_ID', requirement: 'REQUIRED' as const, reason: 'r2' },
  { slot: 'PROOF_OF_ADDRESS', requirement: 'REQUIRED' as const, reason: 'r3' },
  { slot: 'POLICE_REPORT', requirement: 'RECOMMENDED' as const, reason: 'r4' },
];

describe('1. every evidence item gets the action its status implies', () => {
  it('maps each checklist status to one action', () => {
    expect(actionForSlot(slot({ id: 'A' }))).toBe('UPLOAD');
    expect(actionForSlot(slot({ id: 'A', state: 'uploaded' }))).toBe('VIEW');
    expect(actionForSlot(slot({ id: 'A', review: true }))).toBe('VIEW');
    expect(actionForSlot(slot({ id: 'A', replaceRequested: true }))).toBe('REPLACE');
  });

  it('offers UPLOAD when the checklist has no row for the requested slot', () => {
    // The engine asked for a document we have no record of. "Upload" is the honest reading.
    expect(actionForSlot(undefined)).toBe('UPLOAD');
  });

  it('prefers an accepted document over any other signal', () => {
    expect(actionForSlot(slot({ id: 'A', state: 'uploaded', replaceRequested: true }))).toBe('VIEW');
  });

  it('gives the whole synthetic set the right actions', () => {
    const rows = evidenceRows(NEEDS, CHECKLIST);
    expect(rows.map((r) => `${r.documentType}:${r.action}`)).toEqual([
      'FTC_IDENTITY_THEFT_REPORT:UPLOAD',
      'GOVERNMENT_ID:VIEW',
      'PROOF_OF_ADDRESS:VIEW',
      'POLICE_REPORT:REPLACE',
    ]);
  });

  it('labels each action from a resource key, never a literal', () => {
    // One shared vocabulary with the checklist row -- two copies drift in one language.
    expect(actionLabelKey('UPLOAD')).toBe('documents.action.upload');
    expect(actionLabelKey('VIEW')).toBe('documents.action.view');
    expect(actionLabelKey('REPLACE')).toBe('documents.action.replace');
  });
});

describe('2. required and recommended stay distinct', () => {
  it('passes the server level through untouched', () => {
    const rows = evidenceRows(NEEDS, CHECKLIST);
    expect(rows.map((r) => r.requirement)).toEqual(['REQUIRED', 'REQUIRED', 'REQUIRED', 'RECOMMENDED']);
  });

  it('never promotes a recommendation, whatever the status is', () => {
    for (const status of [{}, { state: 'uploaded' as const }, { review: true }, { replaceRequested: true }]) {
      const rows = evidenceRows(
        [{ slot: 'POLICE_REPORT', requirement: 'RECOMMENDED', reason: 'r' }],
        [slot({ id: 'POLICE_REPORT', ...status })]
      );
      expect(rows[0].requirement).toBe('RECOMMENDED');
    }
  });

  it('renders whatever set the server sends, not the synthetic fixture', () => {
    const other = evidenceRows([{ slot: 'SUPPORTING_EVIDENCE', requirement: 'OPTIONAL', reason: 'r' }], []);
    expect(other).toHaveLength(1);
    expect(other[0]).toMatchObject({ documentType: 'SUPPORTING_EVIDENCE', requirement: 'OPTIONAL' });
  });
});

describe('3 + 4. the identifier that travels is the engine’s own slot id', () => {
  const EVIDENCE = readFileSync(new URL('../../components/interview/evidence-needs.tsx', import.meta.url).pathname, 'utf8');
  const SCREEN = readFileSync(new URL('../../app/interview.tsx', import.meta.url).pathname, 'utf8');
  const DOCS = readFileSync(new URL('../../app/(tabs)/documents.tsx', import.meta.url).pathname, 'utf8');

  it('sends the row’s documentType, not an index or a label', () => {
    expect(EVIDENCE).toContain('onOpenDocument(row.documentType)');
    expect(SCREEN).toContain("router.push({ pathname: '/documents', params: { documentType } })");
  });

  it('the documents screen reads that typed parameter and resolves it against real slots', () => {
    expect(DOCS).toContain("useLocalSearchParams<{ documentType?: string }>()");
    expect(DOCS).toContain('normalizeSlotId(slot.id) === requested');
  });

  it('resolution matches the engine ids, tolerating casing and spacing drift', () => {
    expect(slotForEvidence(CHECKLIST, { slot: 'police_report' })?.id).toBe('POLICE_REPORT');
    expect(slotForEvidence(CHECKLIST, { slot: '  GOVERNMENT_ID ' })?.id).toBe('GOVERNMENT_ID');
    expect(normalizeSlotId(' ftc_identity_theft_report ')).toBe('FTC_IDENTITY_THEFT_REPORT');
  });

  it('scrolls to and briefly rings the resolved row rather than sitting at the top', () => {
    expect(DOCS).toContain('scrollRef.current?.scrollTo(');
    expect(DOCS).toContain('highlighted={focusedSlotId === slot.id}');
    /*
     * Nothing may hide the row the consumer was sent to.
     *
     * This used to assert `setFilter('All')`, because the screen carried filter pills and focusing
     * a row had to clear them. The approved Run Zoey redesign removed the pills, so the guarantee
     * is now structural: the panel maps `slots` directly, with no filtering step that could leave
     * the focused row off-screen. Asserting the absence is what keeps a filter from coming back
     * without one.
     */
    expect(DOCS).toContain('{slots.map((slot) => {');
    expect(/slots\s*\.\s*filter\(/.test(DOCS)).toBe(false);
    /*
     * The scroll must keep correcting after the parameter is spent. Firing once used the
     * measurements that existed at that instant, and a row further down had not reported its
     * position yet -- which focused nothing.
     */
    expect(DOCS).toContain('setPendingFocus(targetId)');
    expect(DOCS).toContain('}, [pendingFocus, layoutTick]);');
    /*
     * Keyed on the id string, not the row object: `slots` is rebuilt each render, so depending on
     * `slots.find(...)` re-ran the adopt effect forever and the scroll never landed.
     */
    expect(DOCS).toContain('const targetId =');
    expect(DOCS).toContain('}, [targetId, router]);');
    expect(DOCS).toContain('adopted.current === targetId');
    // The parameter is spent once acted on, so returning later does not re-scroll.
    expect(DOCS).toContain('router.setParams({ documentType: undefined })');
  });

  it('renders one card per slot, not a second copy for the focused one', () => {
    /*
     * The focused row is the same row, ringed -- never an extra one drawn on top. Scoped to the
     * slots map so the panel's own trailing "analysis history" row is not counted.
     */
    const start = DOCS.indexOf('{slots.map((slot) => {');
    const end = DOCS.indexOf('})}', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(DOCS.slice(start, end).match(/<PanelRow/g)?.length).toBe(1);
  });
});

describe('5. an identifier this checklist does not have fails safely', () => {
  it('resolves to nothing rather than throwing or guessing', () => {
    for (const bad of ['', '   ', 'NOT_A_SLOT', undefined, null]) {
      expect(slotForEvidence(CHECKLIST, { slot: bad as unknown as string })).toBeUndefined();
    }
  });

  it('an unresolved row still renders with a usable action', () => {
    const rows = evidenceRows([{ slot: 'BRAND_NEW_SLOT', requirement: 'REQUIRED', reason: 'r' }], CHECKLIST);
    expect(rows[0]).toMatchObject({ documentType: 'BRAND_NEW_SLOT', action: 'UPLOAD', slot: undefined });
  });

  it('the screen guards on a resolved target before scrolling', () => {
    const DOCS = readFileSync(new URL('../../app/(tabs)/documents.tsx', import.meta.url).pathname, 'utf8');
    expect(DOCS).toContain('if (!targetId ||');
    expect(DOCS).toContain('if (!pendingFocus) return;');
  });
});

describe('6 + 7. the A3 upload-source rules still decide the sources', () => {
  it('a police report can be photographed or chosen as a file', () => {
    expect(sourcesForSlot('POLICE_REPORT')).toEqual(['camera', 'library', 'files']);
    expect(slotOffersPhotos('POLICE_REPORT')).toBe(true);
  });

  it('an FTC identity theft report stays file-only', () => {
    expect(sourcesForSlot('FTC_IDENTITY_THEFT_REPORT')).toEqual(['files']);
    expect(slotOffersPhotos('FTC_IDENTITY_THEFT_REPORT')).toBe(false);
  });

  it('the government ID and proof of address keep the sources they already had', () => {
    expect(sourcesForSlot('GOVERNMENT_ID')).toEqual(['camera', 'library', 'files']);
    expect(sourcesForSlot('PROOF_OF_ADDRESS')).toEqual(['camera', 'library', 'files']);
  });

  it('the evidence card never uploads anything itself', () => {
    const EVIDENCE = readFileSync(new URL('../../components/interview/evidence-needs.tsx', import.meta.url).pathname, 'utf8');
    expect(EVIDENCE).not.toMatch(/uploadSlot|ImagePicker|DocumentPicker|fetch\(/);
  });
});

describe('8. the review survives the trip to documents and back', () => {
  const SCREEN = readFileSync(new URL('../../app/interview.tsx', import.meta.url).pathname, 'utf8');
  const ENTRY = readFileSync(new URL('../../components/interview/interview-entry-card.tsx', import.meta.url).pathname, 'utf8');

  it('keeps no local copy of the answers to lose', () => {
    expect(SCREEN).toContain('const load = useCallback(async () => setState(await getInterview()), []);');
    expect(SCREEN).not.toContain("action: 'CANCEL'");
  });

  it('pushes to documents, so going back returns to the open review', () => {
    expect(SCREEN).toContain('router.push({ pathname');
    expect(SCREEN).not.toMatch(/router\.replace\(\{ pathname: '\/documents'/);
  });

  it('re-reads on focus so a completed review shows its real state on return', () => {
    expect(ENTRY).toContain('useFocusEffect');
  });
});

describe('9 + 11. nothing else moved', () => {
  it('the Run Zoey orb still goes to documents and knows nothing of the review', () => {
    const TABS = readFileSync(new URL('../../app/(tabs)/_layout.tsx', import.meta.url).pathname, 'utf8');
    expect(TABS).toContain("router.push('/documents')");
    expect(TABS).not.toContain('interview');
    expect(TABS).not.toContain('documentType');
  });

  it('the Zoey hero still runs the engine and knows nothing of the review', () => {
    const HERO = readFileSync(new URL('../../components/documents/zoey-hero.tsx', import.meta.url).pathname, 'utf8');
    expect(HERO).not.toContain('interview');
    expect(HERO).not.toContain('documentType');
  });

  it('the consumer Dashboard is untouched by this feature', () => {
    const DASH = readFileSync(new URL('../../app/(tabs)/index.tsx', import.meta.url).pathname, 'utf8');
    for (const token of ['interview', 'documentType', 'evidenceNeeds', 'InterviewEntryCard']) {
      expect(`${token}:${DASH.includes(token)}`).toBe(`${token}:false`);
    }
  });
});

describe('10. both languages carry every new key', () => {
  const KEYS = [
    'documents.action.upload',
    'documents.action.view',
    'documents.action.replace',
    'interview.a11yDocumentAction',
    'interview.a11yDocumentHint',
  ];

  it('resolves in English and Spanish, with matching placeholders', () => {
    for (const key of KEYS) {
      expect(`${key}:en:${key in en}`).toBe(`${key}:en:true`);
      expect(`${key}:es:${key in es}`).toBe(`${key}:es:true`);
      const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();
      expect(placeholders(String(en[key]))).toEqual(placeholders(String(es[key])));
    }
  });

  it('every action label key this module can return exists in both languages', () => {
    for (const action of ['UPLOAD', 'VIEW', 'REPLACE'] as const) {
      const key = actionLabelKey(action);
      expect(`${key}:${key in en && key in es}`).toBe(`${key}:true`);
    }
  });
});
