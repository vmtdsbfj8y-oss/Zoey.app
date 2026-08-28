import { describe, expect, it } from 'vitest';

import { isTerminalPane, paneFor, reviewedItems, sortedEvidenceNeeds } from '../interview-presentation';
import type { InterviewView } from '../mobile-interview';

/**
 * One ask on screen at a time, decided from server state alone.
 *
 * The pane table is the app's whole idea of "what happens next", so it is walked exhaustively
 * here: a state the engine can send must land on exactly one determinate pane, and an unknown or
 * half-built view must never come out as "done".
 */

const base: InterviewView = {
  version: 'mobile-interview-v1',
  state: 'OPEN',
  sessionId: 'sess-1',
  items: [],
  pendingQuestion: null,
  pendingSelection: null,
  pendingSummary: null,
  assistantText: null,
  evidenceNeeds: [],
  locale: 'en',
};

const question = {
  questionId: 'q1',
  text: 'Do you recognize this account?',
  kind: 'YES_NO_UNSURE' as const,
  itemKey: 'TRADELINE:X:****1',
  options: [{ value: 'YES', labelKey: 'interview.answer.yes', label: 'Yes' }],
};

describe('which pane a state produces', () => {
  it('maps each terminal state to its own pane', () => {
    expect(paneFor({ ...base, state: 'NOT_STARTED' })).toEqual({ pane: 'NOT_STARTED' });
    expect(paneFor({ ...base, state: 'SPECIALIST_REVIEW' })).toEqual({ pane: 'SPECIALIST' });
    expect(paneFor({ ...base, state: 'COMPLETED' })).toEqual({ pane: 'DONE' });
    expect(paneFor({ ...base, state: 'UNAVAILABLE' })).toEqual({ pane: 'UNAVAILABLE' });
  });

  it('shows the guided question when one is pending', () => {
    expect(paneFor({ ...base, pendingQuestion: question })).toEqual({ pane: 'QUESTION', freeText: false });
  });

  it('flags a free-text question so the composer can offer typing', () => {
    const free = { ...question, kind: 'FREE_TEXT' as const };
    expect(paneFor({ ...base, pendingQuestion: free })).toEqual({ pane: 'QUESTION', freeText: true });
  });

  it('shows the selection and the summary when those are pending', () => {
    const sel = { selectionId: 's1', prompt: 'Which one?', itemKeys: ['a', 'b'] };
    expect(paneFor({ ...base, pendingSelection: sel })).toEqual({ pane: 'SELECTION' });
    const sum = { summaryId: 'm1', text: 'Here is what I understood', itemLines: [] };
    expect(paneFor({ ...base, state: 'AWAITING_CONFIRMATION', pendingSummary: sum })).toEqual({ pane: 'SUMMARY' });
  });
});

describe('a view that contradicts itself still renders one pane', () => {
  it('prefers the summary over a selection or a question', () => {
    const crowded = {
      ...base,
      pendingQuestion: question,
      pendingSelection: { selectionId: 's1', prompt: 'x', itemKeys: ['a'] },
      pendingSummary: { summaryId: 'm1', text: 'y', itemLines: [] },
    };
    expect(paneFor(crowded)).toEqual({ pane: 'SUMMARY' });
  });

  it('an open session with nothing pending is UNAVAILABLE, never DONE', () => {
    // "We do not know what to show" must not be drawn as "your review is finished".
    expect(paneFor({ ...base, state: 'OPEN' })).toEqual({ pane: 'UNAVAILABLE' });
    expect(paneFor(null)).toEqual({ pane: 'UNAVAILABLE' });
    expect(paneFor(undefined)).toEqual({ pane: 'UNAVAILABLE' });
  });

  it('an unrecognised future state falls through to the pending fields, not to DONE', () => {
    const future = { ...base, state: 'SOME_NEW_STATE' as unknown as InterviewView['state'], pendingQuestion: question };
    expect(paneFor(future)).toEqual({ pane: 'QUESTION', freeText: false });
    const futureEmpty = { ...base, state: 'SOME_NEW_STATE' as unknown as InterviewView['state'] };
    expect(paneFor(futureEmpty)).toEqual({ pane: 'UNAVAILABLE' });
  });
});

describe('terminal panes', () => {
  it('are the ones the consumer cannot act on', () => {
    expect(isTerminalPane('DONE')).toBe(true);
    expect(isTerminalPane('SPECIALIST')).toBe(true);
    expect(isTerminalPane('UNAVAILABLE')).toBe(true);
    expect(isTerminalPane('QUESTION')).toBe(false);
    expect(isTerminalPane('SUMMARY')).toBe(false);
    expect(isTerminalPane('NOT_STARTED')).toBe(false);
  });
});

describe('list helpers', () => {
  it('lists only items the review has touched', () => {
    const view = {
      ...base,
      items: [
        { itemKey: 'a', label: 'A', kind: 'TRADELINE' as const, bureaus: [], status: 'UNREVIEWED' as const, classificationKey: null, explanation: null },
        { itemKey: 'b', label: 'B', kind: 'TRADELINE' as const, bureaus: [], status: 'FINAL_RECOGNIZED' as const, classificationKey: 'RECOGNIZED_NO_ISSUE' as const, explanation: null },
      ],
    };
    expect(reviewedItems(view).map((i) => i.itemKey)).toEqual(['b']);
    expect(reviewedItems(null)).toEqual([]);
  });

  it('orders evidence by how much it is needed', () => {
    const view = {
      ...base,
      evidenceNeeds: [
        { slot: 'SUPPORTING_EVIDENCE', requirement: 'OPTIONAL' as const, reasonKey: 'k', reason: 'r' },
        { slot: 'FTC_IDENTITY_THEFT_REPORT', requirement: 'REQUIRED' as const, reasonKey: 'k', reason: 'r' },
        { slot: 'POLICE_REPORT', requirement: 'RECOMMENDED' as const, reasonKey: 'k', reason: 'r' },
      ],
    };
    expect(sortedEvidenceNeeds(view).map((e) => e.requirement)).toEqual(['REQUIRED', 'RECOMMENDED', 'OPTIONAL']);
  });

  it('does not mutate the view it was given', () => {
    const needs = [
      { slot: 'B', requirement: 'OPTIONAL' as const, reasonKey: 'k', reason: 'r' },
      { slot: 'A', requirement: 'REQUIRED' as const, reasonKey: 'k', reason: 'r' },
    ];
    sortedEvidenceNeeds({ ...base, evidenceNeeds: needs });
    expect(needs.map((n) => n.slot)).toEqual(['B', 'A']);
  });
});
