import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { requireEngineBaseUrl } from '@/lib/api-config';
import { MAX_UPLOAD_BYTES, tooLargeMessage } from '@/lib/documents-data';
import { extensionOnly, recordUploadDiagnostic, uriScheme } from '@/lib/upload-diagnostics';
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

/**
 * A photo, from the camera or the library.
 *
 * ==============================  WHAT COMES BACK  ==============================
 *
 * `ImagePicker` returns the asset at full resolution on purpose. Its own `quality` option would
 * re-encode here, before anything has measured the file, and the optimizer already owns that
 * decision -- shrinking twice is how a legible ID becomes an unreadable one. So this hands over the
 * original and lets the ladder decide whether anything needs to happen at all.
 *
 * `exif: false` because nothing downstream wants it and the less that is read the better.
 */
async function pickFromImagePicker(
  source: 'camera' | 'library'
): Promise<PickResult | { state: 'denied'; source: 'camera' | 'library' }> {
  /*
   * Ask once, and honour the answer. `request...Async` returns the existing decision without a
   * prompt when one has already been made, so this cannot become a nag -- and a refusal returns a
   * state the caller turns into an explanation plus the Choose File route, not a dead end.
   */
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) return { state: 'denied', source };

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    exif: false,
    quality: 1,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.length) return { state: 'cancelled' };

  const asset = result.assets[0];
  return {
    state: 'picked',
    document: {
      uri: asset.uri,
      // The picker does not always name a camera capture; a stable fallback keeps the extension
      // logic honest rather than leaving the name empty.
      name: asset.fileName ?? `photo.${asset.mimeType?.split('/')[1] ?? 'jpg'}`,
      mimeType: asset.mimeType ?? null,
      sizeBytes: typeof asset.fileSize === 'number' ? asset.fileSize : null,
    },
  };
}

/** Camera capture. */
export async function pickFromCamera() {
  return pickFromImagePicker('camera');
}

/** Existing photo from the library. */
export async function pickFromLibrary() {
  return pickFromImagePicker('library');
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
export async function uploadDocumentToEngine(
  slot: string,
  document: PickedDocument,
  /** The engine's own figure when the overview has been seen. Falls back to the conservative one. */
  maxBytes: number | undefined = MAX_UPLOAD_BYTES
): Promise<UploadResult> {
  const limit = typeof maxBytes === "number" && maxBytes > 0 ? maxBytes : MAX_UPLOAD_BYTES;
  /*
   * REFUSED HERE, BEFORE THE BYTES LEAVE.
   *
   * Sending a file the platform will reject wastes the whole upload on a phone connection and
   * returns FUNCTION_PAYLOAD_TOO_LARGE -- a Vercel string, in a Zoey screen, describing a limit the
   * app had just told them was 25 MB. The picker already reports the size, so the check is free.
   *
   * Only when the size is actually known: `sizeBytes` is null for some providers, and refusing a
   * file whose size nobody measured would block uploads that are perfectly fine.
   */
  if (typeof document.sizeBytes === 'number' && document.sizeBytes > limit) {
    return {
      state: 'failed',
      message: tooLargeMessage(`${Math.floor(limit / (1024 * 1024))} MB`),
    };
  }

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

  recordUploadDiagnostic({
    step: 'form-built',
    uriScheme: uriScheme(document.uri),
    extension: extensionOnly(document.name),
    mimeType: document.mimeType ?? 'none',
    sizeBytes: typeof document.sizeBytes === 'number' ? document.sizeBytes : undefined,
  });

  let res: Response;
  try {
    res = await authenticatedFetch(`${baseUrl}/api/mobile/documents/upload`, { method: 'POST', body: form });
  } catch (err) {
    if (err instanceof Error && /session/i.test(err.message)) {
      recordUploadDiagnostic({ step: 'request', detail: 'session-expired' });
      return { state: 'failed', message: err.message };
    }
    /*
     * The native uploader threw. That is a genuine network failure, and it is ALSO what happens when
     * the file part names something the platform cannot read -- the two are indistinguishable here,
     * which is why the readability check runs before this and why the diagnostic records the throw.
     */
    recordUploadDiagnostic({ step: 'request', detail: 'fetch-threw' });
    return { state: 'failed', message: "Zoey couldn't upload that photo. Try again." };
  }

  recordUploadDiagnostic({ step: 'response', httpStatus: res.status });

  const body = (await res.json().catch(() => ({}))) as UploadResponseBody;

  /*
   * 413 arrives from two different places and only one of them can speak.
   *
   * The engine answers 413 for its own TOO_LARGE refusal and sends JSON, so its sentence is used.
   * Vercel answers 413 BEFORE any handler runs, with an HTML page naming FUNCTION_PAYLOAD_TOO_LARGE
   * and no JSON at all -- that is what the pre-flight check above exists to prevent, and this is the
   * backstop for whatever slips past it: a file whose size the picker could not report, or multipart
   * overhead tipping a borderline file over. Either way the consumer reads Zoey, never the platform.
   */
  if (res.status === 413) {
    return {
      state: 'failed',
      message: body.message ?? tooLargeMessage(`${Math.floor(limit / (1024 * 1024))} MB`),
    };
  }

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

  recordUploadDiagnostic({ step: 'outcome', detail: body.rejectionCode ?? 'rejected', httpStatus: res.status });
  return {
    state: 'rejected',
    message: body.message ?? 'That file could not be used.',
    rejectionCode: body.rejectionCode ?? null,
  };
}

/**
 * Is the file we are about to send actually there and non-empty?
 *
 * ==============================  WHY BEFORE THE REQUEST  ==============================
 *
 * A FormData file part naming a URI the platform cannot read does not fail loudly. `fetch` throws
 * something generic, the app says it could not reach Zoey, and the person retries a file that was
 * never going to send -- which is precisely the "prepares but doesn't send" report. Asking the
 * filesystem first turns that into a specific, actionable answer.
 *
 * Returns null when the answer cannot be obtained at all, which is treated as "do not block": a
 * platform where the size cannot be read is not evidence the file is missing.
 */
export async function readableFileSize(uri: string): Promise<number | null> {
  try {
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    if (!file.exists) return 0;
    const size = file.size;
    return typeof size === 'number' ? size : null;
  } catch {
    return null;
  }
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
/**
 * Start Zoey, or ask for the analysis to be done again.
 *
 * RERUN exists because the engine's workflow is idempotent: on a client who has already been
 * analysed, an ordinary start walks every stage, finds each one done, and returns the same
 * completion as a real run. The mode is the only thing this request carries beyond the session --
 * which file is analysed and who may analyse it are both decided server-side, as before.
 */
export async function runZoeyOnEngine(mode: 'START' | 'RERUN' = 'START'): Promise<RunResult> {
  let baseUrl: string;
  try {
    baseUrl = requireEngineBaseUrl();
  } catch (err) {
    return unavailable(err instanceof Error ? err.message : 'Zoey is not configured.');
  }

  let res: Response;
  try {
    res = await authenticatedFetch(`${baseUrl}/api/mobile/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
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
