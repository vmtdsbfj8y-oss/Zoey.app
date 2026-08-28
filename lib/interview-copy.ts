import type { InterviewClassification, InterviewEvidenceNeed, InterviewItem } from './mobile-interview';

/**
 * The engine's enums, in the reader's language.
 *
 * The `client-state-copy` contract, applied to the identity review: the engine sends a closed
 * classification enum AND its own English sentence. We render from the ENUM, because matching the
 * sentence would make a copy edit on the server fall back to English silently, and having the
 * engine return localised prose would put a presentation concern in a service that does not know
 * who is reading.
 *
 * An enum this build has never heard of returns null and the caller renders the engine's own
 * `explanation` / `reason`. A newer engine value therefore shows one line in English until it is
 * translated here -- a cosmetic gap, where a blank or a raw key would be a broken screen.
 *
 * This module translates NOTHING itself. It returns keys, and the lookup happens in a component
 * through the reactive `t()`, so a language change repaints immediately.
 */

/** Classification -> resource key. Nothing else may key off these strings. */
const CLASSIFICATION_KEYS: Record<string, string> = {
  RECOGNIZED_NO_ISSUE: 'interview.classification.recognized',
  ORDINARY_INACCURACY_CANDIDATE: 'interview.classification.ordinary',
  NOT_RECOGNIZED_CANDIDATE: 'interview.classification.notRecognized',
  NEEDS_CLARIFICATION: 'interview.classification.needsClarification',
  SPECIALIST_REVIEW: 'interview.classification.specialist',
};

/** Document slot -> resource key. The engine owns which slots exist; these are their names. */
const SLOT_KEYS: Record<string, string> = {
  FTC_IDENTITY_THEFT_REPORT: 'interview.slot.ftcReport',
  POLICE_REPORT: 'interview.slot.policeReport',
  GOVERNMENT_ID: 'interview.slot.governmentId',
  PROOF_OF_ADDRESS: 'interview.slot.proofOfAddress',
  /*
   * Keyed `companyLetter`, not `creditorLetter`, on purpose: an i18n guard forbids the word
   * "creditor" in any resource key, because a key must never be derived from client evidence.
   * The engine's slot id is still CREDITOR_LETTER and the visible copy still says creditor.
   */
  CREDITOR_LETTER: 'interview.slot.companyLetter',
  SUPPORTING_EVIDENCE: 'interview.slot.supportingEvidence',
};

/** Requirement level -> resource key. */
const REQUIREMENT_KEYS: Record<string, string> = {
  REQUIRED: 'interview.requirement.required',
  RECOMMENDED: 'interview.requirement.recommended',
  OPTIONAL: 'interview.requirement.optional',
};

/** Guided answer value -> resource key. The engine also sends a label; this localizes it. */
const ANSWER_KEYS: Record<string, string> = {
  YES: 'interview.answer.yes',
  NO: 'interview.answer.no',
  UNSURE: 'interview.answer.unsure',
};

/** Exported so a test can assert the tables and the translation files agree. */
export const TRANSLATABLE_CLASSIFICATIONS = Object.keys(CLASSIFICATION_KEYS);
export const TRANSLATABLE_SLOTS = Object.keys(SLOT_KEYS);
export const TRANSLATABLE_REQUIREMENTS = Object.keys(REQUIREMENT_KEYS);
export const TRANSLATABLE_ANSWERS = Object.keys(ANSWER_KEYS);

export function classificationKeyFor(classification: InterviewClassification | string | null | undefined): string | null {
  if (!classification) return null;
  return CLASSIFICATION_KEYS[classification] ?? null;
}

export function slotKeyFor(slot: string | null | undefined): string | null {
  if (!slot) return null;
  return SLOT_KEYS[slot] ?? null;
}

export function requirementKeyFor(requirement: string | null | undefined): string | null {
  if (!requirement) return null;
  return REQUIREMENT_KEYS[requirement] ?? null;
}

export function answerKeyFor(value: string | null | undefined): string | null {
  if (!value) return null;
  return ANSWER_KEYS[value] ?? null;
}

/**
 * The line to show for one reviewed item: the translated classification, or the engine's own
 * sentence when this build does not know the enum.
 */
export function itemLineFor(item: Pick<InterviewItem, 'classificationKey' | 'explanation'>, translate: (key: string) => string): string | null {
  const key = classificationKeyFor(item.classificationKey);
  if (key) return translate(key);
  return item.explanation ?? null;
}

/** The name and reason for one evidence need, each falling back to the engine's own words. */
export function evidenceCopyFor(
  need: Pick<InterviewEvidenceNeed, 'slot' | 'requirement' | 'reason'>,
  translate: (key: string) => string
): { name: string; requirement: string | null; reason: string } {
  const slotKey = slotKeyFor(need.slot);
  const requirementKey = requirementKeyFor(need.requirement);
  return {
    name: slotKey ? translate(slotKey) : need.slot,
    requirement: requirementKey ? translate(requirementKey) : need.requirement,
    reason: need.reason,
  };
}

/** The label for one guided option, preferring this build's translation over the engine's text. */
export function answerLabelFor(option: { value: string; label: string }, translate: (key: string) => string): string {
  const key = answerKeyFor(option.value);
  return key ? translate(key) : option.label;
}
