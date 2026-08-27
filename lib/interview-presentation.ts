import type { InterviewView } from './mobile-interview';

/**
 * Which single pane the identity review is showing, decided from server state alone.
 *
 * ==============================  ONE ASK AT A TIME  ==============================
 *
 * The engine guarantees at most one of `pendingQuestion` / `pendingSelection` / `pendingSummary`
 * is non-null. This function does not trust that by accident -- it reads them in a fixed priority
 * so that even a malformed view renders one determinate pane instead of two overlapping asks.
 *
 * Pure and import-free apart from the view type, so the pane table can be exhaustively tested
 * without a renderer, a network, or a session. Every branch below is a value a test can construct.
 *
 * ==============================  THE STAGE THAT DOES NOT EXIST YET  ==============================
 *
 * A later phase adds an identity-verification / report-connection step (the consumer proves who
 * they are and links their report before or during the review). That stage is NOT modelled here:
 * its fields depend on requirements Equifax has not confirmed, and a guessed shape would have to
 * be unpicked from the pane union, the screen, and both translation files.
 *
 * What is prepared for it is the SEAM: panes are derived from server state only, so the stage
 * arrives as a new `state`/pending value from the engine plus one new branch below and one new
 * component. Nothing else moves. Do not add speculative fields until the requirements are real.
 */

export type InterviewPane =
  /** Eligible, nothing started. The screen offers to begin. */
  | { pane: 'NOT_STARTED' }
  /** A guided question is waiting. `freeText` is true only when the engine offered that kind. */
  | { pane: 'QUESTION'; freeText: boolean }
  /** Several report items may match what was described; the consumer picks. */
  | { pane: 'SELECTION' }
  /** Zoey's understanding, read back. Nothing is confirmed until this is accepted. */
  | { pane: 'SUMMARY' }
  /** Handed to a person. Terminal for this session's automation. */
  | { pane: 'SPECIALIST' }
  /** Finished. Evidence needs, if any, are what remains. */
  | { pane: 'DONE' }
  /** Feature off, unreadable, or a session with nothing to show. Never "all clear". */
  | { pane: 'UNAVAILABLE' };

export function paneFor(view: InterviewView | null | undefined): InterviewPane {
  if (!view) return { pane: 'UNAVAILABLE' };

  switch (view.state) {
    case 'UNAVAILABLE':
      return { pane: 'UNAVAILABLE' };
    case 'NOT_STARTED':
      return { pane: 'NOT_STARTED' };
    case 'SPECIALIST_REVIEW':
      return { pane: 'SPECIALIST' };
    case 'COMPLETED':
      return { pane: 'DONE' };
    case 'OPEN':
    case 'AWAITING_CONFIRMATION':
    default:
      break;
  }

  // Fixed priority: the narrowest ask wins, so a malformed view still renders one pane.
  if (view.pendingSummary) return { pane: 'SUMMARY' };
  if (view.pendingSelection) return { pane: 'SELECTION' };
  if (view.pendingQuestion) {
    return { pane: 'QUESTION', freeText: view.pendingQuestion.kind === 'FREE_TEXT' };
  }

  /*
   * An live session with no ask and no terminal state. That is the engine thinking, or a view we
   * do not understand. It is not "done" and must never be drawn as such.
   */
  return { pane: 'UNAVAILABLE' };
}

/** True when the review has reached a state the consumer cannot act on any further. */
export function isTerminalPane(pane: InterviewPane['pane']): boolean {
  return pane === 'DONE' || pane === 'SPECIALIST' || pane === 'UNAVAILABLE';
}

/** Items worth listing on screen: everything the engine sent, newest decision last. */
export function reviewedItems(view: InterviewView | null | undefined) {
  if (!view) return [];
  return view.items.filter((item) => item.status !== 'UNREVIEWED');
}

/** Evidence the consumer must or should supply. OPTIONAL is advisory and is listed last. */
export function sortedEvidenceNeeds(view: InterviewView | null | undefined) {
  if (!view) return [];
  const rank = { REQUIRED: 0, RECOMMENDED: 1, OPTIONAL: 2 } as const;
  return [...view.evidenceNeeds].sort((a, b) => rank[a.requirement] - rank[b.requirement]);
}
