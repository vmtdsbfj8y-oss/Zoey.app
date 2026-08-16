import { guard, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { storeFor, type StoredScore } from './_lib/store.js';

/**
 * GET /api/scores -> { latest, history, extractionAvailable }
 *
 * ---------------------------------------------------------------------------
 * Returns ONLY scores actually extracted from an analyzed report. Today that is
 * always an empty list, because the analyzer (api/_lib/pipeline.ts) is a stub
 * that does not read document contents -- so nothing has ever called
 * `store.putScore`.
 *
 * The app renders an explicit "no score available yet" state off the back of
 * that. No score is estimated, averaged across bureaus, or copied out of the
 * placeholder data the Dashboard currently uses for layout.
 *
 * When real extraction lands, write one StoredScore per bureau per report and
 * this endpoint starts returning history for free -- readings are appended, and
 * `latest` is derived per bureau rather than overwritten.
 * ---------------------------------------------------------------------------
 */

export type BureauName = 'TransUnion' | 'Experian' | 'Equifax';

export type ScoresPayload = {
  /** Most recent reading per bureau. Never a blended or averaged figure. */
  latest: StoredScore[];
  /** Every reading, oldest first, grouped by bureau. Drives score history. */
  history: { bureau: BureauName; entries: { score: number; capturedAt: number; model?: string }[] }[];
  /** False while the analyzer cannot read documents -- lets the app explain why. */
  extractionAvailable: boolean;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (guard(req, res, 'GET')) return;
  const user = await requireUser(req, res); if (!user) return;
  const store = storeFor(user.id);

  const all = await store.listScores();

  const byBureau = new Map<BureauName, StoredScore[]>();
  for (const s of all) {
    const list = byBureau.get(s.bureau) ?? [];
    list.push(s);
    byBureau.set(s.bureau, list);
  }

  const history = [...byBureau.entries()].map(([bureau, entries]) => ({
    bureau,
    entries: entries.map((e) => ({ score: e.score, capturedAt: e.capturedAt, model: e.model })),
  }));

  // listScores() is sorted oldest-first, so the last entry per bureau is latest.
  const latest = [...byBureau.values()].map((entries) => entries[entries.length - 1]);

  const payload: ScoresPayload = {
    latest,
    history,
    // The stub pipeline never extracts, so this stays false until it does.
    extractionAvailable: false,
  };

  res.status(200).json(payload);
}
