import * as DocumentPicker from 'expo-document-picker';

import { requireEngineBaseUrl } from '@/lib/api-config';
import { authenticatedFetch } from '@/lib/auth-fetch';

/**
 * Documents and Run Zoey, against the real credit engine.
 *
 * ==========================  WHICH BACKEND, AND WHY IT MATTERS  ==========================
 *
 * Every request here goes to `requireEngineBaseUrl()` -- the-wizard -- and never to zoey-app-api.
 * That separation is the point: report bytes belong to the engine that stores them privately and
 * parses them. zoey-app-api holds membership, profile and goals, and must never receive a credit
 * report.
 *
 * ==========================  WHAT THE APP IS ALLOWED TO SEND  ==========================
 *
 * The file, the slot it fills, and the Supabase token. There is deliberately no parameter anywhere
 * in this module for a client id or an owner id: which credit file a document lands on is decided
 * by the token's verified signature, server-side. A value sent from here could only be ignored, so
 * none is offered.
 *
 * The slot ids are the engine's own -- they arrive in the overview checklist and go straight back
 * on upload. No translation table, so there is nothing to drift out of step with the engine.
 */

/** A file the person actually chose. Bytes exist on disk at `uri`. */
export type PickedDocument = {
  uri: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type PickResult =
  | { state: 'picked'; document: PickedDocument }
  | { state: 'cancelled' };

/**
 * Opens the system picker.
 *
 * The type filter is a convenience, not a control: the engine re-checks the bytes, because a
 * filter a client can dismiss is not a rule. HTML is included because the IdentityIQ export is a
 * real supported report format.
 */
export async function pickDocument(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*', 'text/html'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.length) return { state: 'cancelled' };

  const asset = result.assets[0];
  return {
    state: 'picked',
    document: {
      uri: asset.uri,
      name: asset.name ?? 'document',
      mimeType: asset.mimeType ?? null,
      sizeBytes: typeof asset.size === 'number' ? asset.size : null,
    },
  };
}

export type UploadResult =
  | {
      state: 'uploaded';
      documentId: string | null;
      status: string | null;
      intakeComplete: boolean;
      /** True when the engine validated and accepted it outright. */
      accepted: boolean;
      /** Why a stored document still needs a person. Null when accepted. */
      reviewReason: string | null;
    }
  /** The engine looked at the file and declined it. The message says why, in plain language. */
  | { state: 'rejected'; message: string; rejectionCode: string | null }
  /** Ours, not theirs: storage or the network. Worth retrying. */
  | { state: 'failed'; message: string };

type UploadResponseBody = {
  ok?: boolean;
  message?: string;
  rejectionCode?: string | null;
  documentId?: string | null;
  status?: string | null;
  intake?: { complete?: boolean } | null;
  accepted?: boolean;
  reviewReason?: string | null;
};

/**
 * Sends the chosen file's BYTES to the engine.
 *
 * React Native streams the file from `uri` when the form part is `{ uri, name, type }`, so the
 * bytes leave the device -- this is not a filename standing in for a file. `Content-Type` is left
 * unset on purpose: the runtime writes it, with the multipart boundary, and overriding it produces
 * a body the server cannot split.
 */
export async function uploadDocumentToEngine(slot: string, document: PickedDocument): Promise<UploadResult> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return { state: 'failed', message: err instanceof Error ? err.message : 'Zoey is not configured.' };
  }

  const form = new FormData();
  // RN's FormData takes this shape for a file part; the cast is the documented escape hatch.
  form.append('file', {
    uri: document.uri,
    name: document.name,
    type: document.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);
  form.append('documentType', slot);
  form.append('filename', document.name);

  let res: Response;
  try {
    res = await authenticatedFetch(`${baseUrl}/api/mobile/documents/upload`, { method: 'POST', body: form });
  } catch (err) {
    if (err instanceof Error && /session/i.test(err.message)) {
      return { state: 'failed', message: err.message };
    }
    return { state: 'failed', message: "Can't reach Zoey. Check your connection and try again." };
  }

  const body = (await res.json().catch(() => ({}))) as UploadResponseBody;

  if (res.ok && body.ok) {
    return {
      state: 'uploaded',
      documentId: body.documentId ?? null,
      status: body.status ?? null,
      intakeComplete: body.intake?.complete === true,
      accepted: body.accepted === true,
      reviewReason: body.reviewReason ?? null,
    };
  }

  /*
   * 5xx is ours. Calling it a rejection would tell someone to fix a file that was fine, and they
   * would keep re-picking a document that was never the problem.
   */
  if (res.status >= 500) {
    return { state: 'failed', message: body.message ?? 'Zoey could not store that right now. Please try again.' };
  }

  return {
    state: 'rejected',
    message: body.message ?? 'That file could not be used.',
    rejectionCode: body.rejectionCode ?? null,
  };
}

/* -------------------------------------------------------------------------- *
 * Run Zoey
 * -------------------------------------------------------------------------- */

/** Mirrors the engine's stages. Labels are shown; ids are matched. */
export const RUN_STAGES = [
  { id: 'READING_DOCUMENTS', label: 'Reading documents' },
  { id: 'ANALYZING_REPORT', label: 'Analyzing report' },
  { id: 'REVIEWING_ACCOUNTS', label: 'Reviewing accounts' },
  { id: 'PREPARING_STRATEGY', label: 'Preparing strategy' },
  { id: 'READY_FOR_NEXT_STEP', label: 'Ready for next step' },
] as const;

export type RunStageId = (typeof RUN_STAGES)[number]['id'];
export type RunOutcome = 'READY' | 'ALREADY_RUNNING' | 'MISSING_DOCUMENTS' | 'BLOCKED' | 'UNAVAILABLE';

export type RunResult = {
  ok: boolean;
  outcome: RunOutcome;
  stage: RunStageId;
  label: string;
  missing: string[];
  message: string;
};

/** Starts the real workflow. Sends no body -- the engine reads only the token. */
export async function runZoeyOnEngine(): Promise<RunResult> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return unavailable(err instanceof Error ? err.message : 'Zoey is not configured.');
  }

  let res: Response;
  try {
    res = await authenticatedFetch(`${baseUrl}/api/mobile/run`, { method: 'POST' });
  } catch (err) {
    if (err instanceof Error && /session/i.test(err.message)) return unavailable(err.message);
    return unavailable("Can't reach Zoey. Check your connection and try again.");
  }

  const body = (await res.json().catch(() => ({}))) as Partial<RunResult>;
  if (!body.outcome || !body.stage) {
    return unavailable('Zoey sent a response this app could not read.');
  }

  return {
    ok: body.ok === true,
    outcome: body.outcome,
    stage: body.stage,
    label: body.label ?? labelFor(body.stage),
    missing: body.missing ?? [],
    message: body.message ?? '',
  };
}

function unavailable(message: string): RunResult {
  return { ok: false, outcome: 'UNAVAILABLE', stage: 'READING_DOCUMENTS', label: labelFor('READING_DOCUMENTS'), missing: [], message };
}

export function labelFor(stage: RunStageId): string {
  return RUN_STAGES.find((s) => s.id === stage)?.label ?? 'Working';
}

/* -------------------------------------------------------------------------- *
 * Turning a reported stage into what the screen draws. Pure, and testable.
 * -------------------------------------------------------------------------- */

export type StageState = 'pending' | 'active' | 'done' | 'failed';

/**
 * Stage states from the ONE stage the engine reported reaching.
 *
 * Everything before it is done because the conductor runs in order and could not have reached this
 * stage otherwise. This is derived from a server answer, not advanced by a clock: without a new
 * response nothing here changes, which is the difference between reporting progress and animating
 * it.
 */
export function stagesFrom(reached: RunStageId, outcome: RunOutcome): Record<string, StageState> {
  const index = RUN_STAGES.findIndex((s) => s.id === reached);
  const out: Record<string, StageState> = {};

  RUN_STAGES.forEach((stage, i) => {
    if (i < index) out[stage.id] = 'done';
    else if (i > index) out[stage.id] = 'pending';
    else if (outcome === 'BLOCKED' || outcome === 'UNAVAILABLE') out[stage.id] = 'failed';
    else if (outcome === 'READY') out[stage.id] = 'done';
    else out[stage.id] = 'active';
  });

  return out;
}

/** The share of stages the server actually reported done. Never interpolated. */
export function progressFrom(stages: Record<string, StageState>): number {
  const ids = Object.keys(stages);
  if (!ids.length) return 0;
  return ids.filter((id) => stages[id] === 'done').length / ids.length;
}

/** True only while real work is in flight -- the one condition that justifies polling. */
export function shouldKeepPolling(outcome: RunOutcome): boolean {
  return outcome === 'ALREADY_RUNNING';
}

/**
 * Asks the engine to re-apply its acceptance rule to documents already sent.
 *
 * Acceptance runs when a document is uploaded, so anything sent before that rule existed is still
 * sitting in the state uploads used to land in. This is how those get decided without asking
 * someone to send the same file again -- which the duplicate check would decline anyway.
 *
 * Best effort by design: if it fails, the screen still renders whatever the overview says. It
 * never invents a decision, and the engine re-reads every row before deciding.
 */
export async function recheckDocuments(): Promise<{ accepted: number; intakeComplete: boolean } | null> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch {
    return null;
  }

  try {
    const res = await authenticatedFetch(`${baseUrl}/api/mobile/documents/recheck`, { method: 'POST' });
    if (!res.ok) return null;
    const body = (await res.json()) as { accepted?: number; intakeComplete?: boolean };
    return { accepted: body.accepted ?? 0, intakeComplete: body.intakeComplete === true };
  } catch {
    return null;
  }
}
