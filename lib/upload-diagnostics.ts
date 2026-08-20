/**
 * A sanitized trace of one upload attempt.
 *
 * ==============================  WHY THIS EXISTS  ==============================
 *
 * An oversized photo optimized correctly on a real phone and then "didn't send", and every layer
 * involved -- the picker, the encoder, the cache file, FormData, the native uploader, the engine --
 * fails in a way that looks identical from the screen. Reading the code proved the ORDER was right
 * and could not prove which step stopped, because the difference only exists at runtime on a device.
 *
 * ==============================  WHAT IT MAY RECORD  ==============================
 *
 * Shapes and outcomes, never content. A URI is reduced to its scheme and whether it sits in the
 * app's cache; a filename to its extension; a document to its size and type. There is deliberately
 * no parameter here that can carry a name, an address, a token, a client id or a storage key, so
 * there is no call site that could pass one by mistake.
 *
 * DEVELOPMENT AND PREVIEW ONLY. `__DEV__` is true in Expo Go and in a development build and false in
 * a production build, so nothing here reaches a shipped app.
 */

export interface UploadDiagnosticEvent {
  step:
    | 'picked'
    | 'plan'
    | 'optimize-step'
    | 'optimized'
    | 'output-check'
    | 'form-built'
    | 'request'
    | 'response'
    | 'outcome';
  /** Closed vocabulary set by the call site. Never free text from a file or a server. */
  detail?: string;
  sizeBytes?: number;
  /** `file`, `content`, `ph`, `data`, or `none`. The scheme only -- never the path. */
  uriScheme?: string;
  /** Lowercased extension with no dot, or `none`. */
  extension?: string;
  mimeType?: string;
  httpStatus?: number;
}

const MAX_EVENTS = 60;
const events: (UploadDiagnosticEvent & { at: number })[] = [];

/** Scheme only. A cache path can contain a filename, and a filename can contain a person's name. */
export function uriScheme(uri: string | null | undefined): string {
  if (!uri) return 'none';
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(uri.trim());
  return match ? match[1].toLowerCase() : 'relative';
}

/** Extension only, for the same reason. */
export function extensionOnly(name: string | null | undefined): string {
  if (!name) return 'none';
  const parts = name.toLowerCase().trim().split('.');
  return parts.length > 1 ? (parts.pop() || 'none') : 'none';
}

export function recordUploadDiagnostic(event: UploadDiagnosticEvent): void {
  if (!__DEV__) return;

  const entry = { ...event, at: Date.now() };
  events.push(entry);
  if (events.length > MAX_EVENTS) events.shift();

  const parts = [
    `[zoey-upload] ${event.step}`,
    event.detail ? `detail=${event.detail}` : '',
    typeof event.sizeBytes === 'number' ? `bytes=${event.sizeBytes}` : '',
    event.uriScheme ? `uri=${event.uriScheme}:` : '',
    event.extension ? `ext=${event.extension}` : '',
    event.mimeType ? `mime=${event.mimeType}` : '',
    typeof event.httpStatus === 'number' ? `http=${event.httpStatus}` : '',
  ].filter(Boolean);

  // eslint-disable-next-line no-console
  console.log(parts.join(' '));
}

/** The trace so far, for a diagnostics surface. Empty in production because nothing was recorded. */
export function uploadDiagnostics(): (UploadDiagnosticEvent & { at: number })[] {
  return [...events];
}

export function resetUploadDiagnostics(): void {
  events.length = 0;
}
