import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The screen doctrine, asserted at the source level.
 *
 * Vitest here is node-only and renders nothing, so behaviour that lives in a component is checked
 * the way this repo already checks it: by reading the file and asserting the shape. These are the
 * properties that would be expensive to discover from a bug report.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url).pathname, 'utf8');

const SCREEN = read('../../app/interview.tsx');
const ENTRY = read('../../components/interview/interview-entry-card.tsx');
const DOCUMENTS = read('../../app/(tabs)/documents.tsx');
const LAYOUT = read('../../app/_layout.tsx');
const SUMMARY = read('../../components/interview/reflect-back-card.tsx');

describe('the screen owns no step machine', () => {
  it('renders the pane the server state implies', () => {
    expect(SCREEN).toContain('paneFor(view)');
    expect(SCREEN).toContain("from '@/lib/interview-presentation'");
  });

  it('sends only ids the engine issued in the view it is rendering', () => {
    expect(SCREEN).toContain('questionId: view.pendingQuestion!.questionId');
    expect(SCREEN).toContain('selectionId: view.pendingSelection!.selectionId');
    expect(SCREEN).toContain('summaryId: view.pendingSummary!.summaryId');
    // No locally generated identifier may ever become a pending id.
    expect(SCREEN).not.toMatch(/Math\.random|Date\.now\(\)|uuid|nanoid/);
  });

  it('holds no client or owner id at all', () => {
    for (const forbidden of ['clientId', 'ownerId', 'subject:']) {
      expect(`${forbidden}:${SCREEN.includes(forbidden)}`).toBe(`${forbidden}:false`);
    }
  });
});

describe('one submit at a time', () => {
  it('guards with a ref set before the first await, not with state', () => {
    expect(SCREEN).toContain('const inFlight = useRef(false)');
    expect(SCREEN).toContain('if (inFlight.current) return;');
    // The guard must be set before the await, or two taps in a frame both pass it.
    const guardAt = SCREEN.indexOf('inFlight.current = true');
    const awaitAt = SCREEN.indexOf('await submitInterview');
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(awaitAt);
  });

  it('re-reads when the server says the form is stale', () => {
    expect(SCREEN).toContain('if (needsRefetch(result)) await load();');
  });
});

describe('closing must not destroy progress', () => {
  it('never wires CANCEL to a control', () => {
    // CANCEL exists on the seam; a stray tap must not be able to discard recorded answers.
    expect(SCREEN).not.toContain("action: 'CANCEL'");
  });

  it('the entry card re-reads on focus so a resumed review shows its real state', () => {
    expect(ENTRY).toContain('useFocusEffect');
  });
});

describe('the reflect-back is the consent gate', () => {
  it('offers all three engine decisions, not just agreement', () => {
    for (const decision of ["'YES'", "'CHANGE'", "'NOT_SURE'"]) {
      expect(`${decision}:${SUMMARY.includes(decision)}`).toBe(`${decision}:true`);
    }
  });

  it('renders the classification from the enum, falling back to the engine sentence', () => {
    expect(SUMMARY).toContain('classificationKeyFor(line.classificationKey)');
    expect(SUMMARY).toContain('key ? t(key) : line.line');
  });
});

describe('entry point and route', () => {
  it('is reachable from the Run Zoey destination', () => {
    expect(DOCUMENTS).toContain('InterviewEntryCard');
    expect(DOCUMENTS).toContain("router.push('/interview')");
  });

  it('is not behind the membership gate, because the engine does not gate it', () => {
    // The card appears in both the member and non-member branches of the documents screen.
    expect(DOCUMENTS.match(/<InterviewEntryCard/g)?.length).toBe(2);
  });

  it('is declared as a modal inside the signed-in guard', () => {
    expect(LAYOUT).toContain('<Stack.Screen name="interview"');
    expect(LAYOUT).toContain("presentation: 'modal', title: 'Identity Review'");
    const guardAt = LAYOUT.indexOf('guard={Boolean(session)}');
    const routeAt = LAYOUT.indexOf('name="interview"');
    expect(guardAt).toBeLessThan(routeAt);
  });

  it('leaves the Run Zoey orb and the Zoey hero exactly as they were', () => {
    const tabs = read('../../app/(tabs)/_layout.tsx');
    expect(tabs).toContain("router.push('/documents')");
    expect(tabs).not.toContain('interview');
    expect(read('../../components/documents/zoey-hero.tsx')).not.toContain('interview');
  });
});

describe('the free-text composer is engine-driven', () => {
  it('appears only when the engine asked a FREE_TEXT question', () => {
    expect(SCREEN).toContain('pane.freeText ?');
    // In guided-only mode the engine never sends one, so the box simply never renders.
    expect(SCREEN).toContain("action: 'MESSAGE'");
  });
});
