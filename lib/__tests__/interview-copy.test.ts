import { describe, expect, it } from 'vitest';

import { en } from '../i18n/en';
import { es } from '../i18n/es';
import {
  TRANSLATABLE_ANSWERS,
  TRANSLATABLE_CLASSIFICATIONS,
  TRANSLATABLE_REQUIREMENTS,
  TRANSLATABLE_SLOTS,
  answerKeyFor,
  answerLabelFor,
  classificationKeyFor,
  evidenceCopyFor,
  itemLineFor,
  requirementKeyFor,
  slotKeyFor,
} from '../interview-copy';

/**
 * The engine's enums, rendered from the enum and never from the sentence.
 *
 * Two failure modes are guarded here. A key this module names but neither translation file
 * carries would render a raw key to a person; an enum the engine sends that this build has never
 * heard of must fall back to the engine's own words rather than to a blank.
 */

const every = [
  ...TRANSLATABLE_CLASSIFICATIONS.map((v) => classificationKeyFor(v)),
  ...TRANSLATABLE_SLOTS.map((v) => slotKeyFor(v)),
  ...TRANSLATABLE_REQUIREMENTS.map((v) => requirementKeyFor(v)),
  ...TRANSLATABLE_ANSWERS.map((v) => answerKeyFor(v)),
].filter((k): k is string => Boolean(k));

describe('every key this module names exists in both languages', () => {
  it('resolves in English', () => {
    for (const key of every) expect(`${key}:${key in en}`).toBe(`${key}:true`);
  });

  it('resolves in Spanish', () => {
    for (const key of every) expect(`${key}:${key in es}`).toBe(`${key}:true`);
  });

  it('covers the engine vocabularies the interview can actually produce', () => {
    expect(TRANSLATABLE_CLASSIFICATIONS).toEqual(
      expect.arrayContaining([
        'RECOGNIZED_NO_ISSUE',
        'ORDINARY_INACCURACY_CANDIDATE',
        'NOT_RECOGNIZED_CANDIDATE',
        'NEEDS_CLARIFICATION',
        'SPECIALIST_REVIEW',
      ])
    );
    expect(TRANSLATABLE_SLOTS).toEqual(
      expect.arrayContaining(['FTC_IDENTITY_THEFT_REPORT', 'POLICE_REPORT', 'GOVERNMENT_ID', 'PROOF_OF_ADDRESS'])
    );
    expect(TRANSLATABLE_ANSWERS).toEqual(expect.arrayContaining(['YES', 'NO', 'UNSURE']));
  });
});

describe('an enum this build has never heard of', () => {
  const t = (key: string) => `T(${key})`;

  it('returns no key rather than guessing one', () => {
    expect(classificationKeyFor('SOMETHING_NEW')).toBeNull();
    expect(slotKeyFor('NEW_SLOT')).toBeNull();
    expect(requirementKeyFor('MAYBE')).toBeNull();
    expect(answerKeyFor('PERHAPS')).toBeNull();
    expect(classificationKeyFor(null)).toBeNull();
  });

  it('falls back to the engine’s own sentence for an item line', () => {
    expect(itemLineFor({ classificationKey: 'RECOGNIZED_NO_ISSUE', explanation: 'engine words' }, t))
      .toBe('T(interview.classification.recognized)');
    expect(itemLineFor({ classificationKey: 'BRAND_NEW' as never, explanation: 'engine words' }, t))
      .toBe('engine words');
    // No key and no sentence is null, so the caller renders nothing rather than an empty row.
    expect(itemLineFor({ classificationKey: null, explanation: null }, t)).toBeNull();
  });

  it('falls back to the engine’s slot name and reason for evidence', () => {
    const known = evidenceCopyFor({ slot: 'POLICE_REPORT', requirement: 'RECOMMENDED', reason: 'because' }, t);
    expect(known.name).toBe('T(interview.slot.policeReport)');
    expect(known.requirement).toBe('T(interview.requirement.recommended)');
    expect(known.reason).toBe('because');

    // A requirement level a newer engine might send, which this build has no key for.
    const unknown = evidenceCopyFor({ slot: 'NEW_SLOT', requirement: 'WHENEVER' as never, reason: 'because' }, t);
    expect(unknown.name).toBe('NEW_SLOT');
    expect(unknown.requirement).toBe('WHENEVER');
  });

  it('prefers this build’s answer label over the engine’s text, and falls back when unknown', () => {
    expect(answerLabelFor({ value: 'YES', label: 'Yes' }, t)).toBe('T(interview.answer.yes)');
    expect(answerLabelFor({ value: 'PERHAPS', label: 'Perhaps' }, t)).toBe('Perhaps');
  });
});

describe('the copy never claims more than the engine recorded', () => {
  it('says what the consumer stated, not what it means legally', () => {
    for (const resource of [en, es]) {
      const line = String(resource['interview.classification.notRecognized']);
      expect(line.length).toBeGreaterThan(0);
      // The strongest thing this screen may say is that the consumer said it.
      expect(line).not.toMatch(/fraud|identity theft|robo de identidad|stolen|robada/i);
    }
  });

  it('promises no outcome anywhere in the namespace', () => {
    for (const resource of [en, es]) {
      for (const [key, value] of Object.entries(resource)) {
        if (!key.startsWith('interview.')) continue;
        expect(`${key}:${/guarantee|guaranteed|garantiz/i.test(String(value))}`).toBe(`${key}:false`);
      }
    }
  });
});
