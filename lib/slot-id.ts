/**
 * One way to read the engine's slot id, importable from anywhere.
 *
 * This lives alone because it is the single thing both halves of the document vocabulary need.
 * `document-copy` maps a slot id to a translation key; `interview-evidence-actions` joins the
 * interview's evidence needs to the checklist by the same id. Each was importing the other for it,
 * and Metro reported the cycle:
 *
 *   document-copy -> interview-evidence-actions -> document-copy
 *
 * Require cycles are tolerated by the bundler and then resolved in whatever order the graph happens
 * to be walked, so one of the two modules can observe the other's exports as `undefined` at
 * evaluation time. Here that would have meant `DOCUMENT_ACTION_KEYS[action]` throwing on a cold
 * start -- an intermittent failure that depends on import order rather than on anything a test
 * would naturally vary.
 *
 * A leaf module with no imports of its own cannot participate in a cycle, so this is the fix rather
 * than a reordering that happens to work today.
 */

/** Slot ids are the engine's. Compared case-insensitively so a casing drift cannot orphan a row. */
export function normalizeSlotId(slotId: string | null | undefined): string {
  return String(slotId ?? '').trim().toUpperCase();
}
