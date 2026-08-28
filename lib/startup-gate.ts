/**
 * WHAT IS ALLOWED TO HOLD THE NATIVE SPLASH, AND FOR HOW LONG.
 *
 * ==============================  THE FAILURE THIS EXISTS FOR  ==============================
 *
 * The splash is hidden from a `useEffect` in the root layout. That is fine until something in the
 * tree throws while rendering: the effect never runs, `hideAsync` is never called, and the app sits
 * behind the native ZOEY splash forever with no error, no retry and nothing in the UI to say what
 * happened. A reload re-arms `preventAutoHideAsync()` and reproduces it exactly.
 *
 * It was a render-time ReferenceError that found this, but the cause is not interesting -- ANY
 * throw, any font that never resolves, any startup promise that neither settles nor rejects
 * produces the same dead screen. So the rule here is about the splash, not about any one bug:
 *
 *   The splash may only be held during a BOUNDED wait. Every other phase hides it.
 *
 * ==============================  WHY A PURE MODULE  ==============================
 *
 * The decision is separated from the renderer so it can be walked exhaustively by a test that
 * needs neither a simulator nor a native module. A regression here is a stuck launch screen, which
 * is the single most expensive thing this app can do to somebody -- it cannot be checked by hand
 * every release.
 */

export type StartupPhase =
  /** Fonts are still loading and the budget has not expired. The ONLY phase that holds the splash. */
  | 'WAITING'
  /** Fonts resolved. Render the app normally. */
  | 'READY'
  /** Fonts failed or took too long. Render anyway, in system fonts. */
  | 'DEGRADED'
  /** Something threw while rendering. Render a visible, retryable error. */
  | 'FAILED';

/**
 * How long the splash may wait on fonts.
 *
 * Long enough for a cold start on a slow device, short enough that a person is never left looking
 * at a logo wondering whether the app is broken. Exceeding it is not an error -- the app renders in
 * the system font, which is a cosmetic reflow rather than a dead screen.
 */
export const STARTUP_TIMEOUT_MS = 6000;

export interface StartupInput {
  fontsLoaded: boolean;
  /** `useFonts` reported a failure. */
  fontError: boolean;
  /** The budget above expired. */
  timedOut: boolean;
  /** The error boundary caught a throw from the tree. */
  renderError: boolean;
}

export function startupPhase(input: StartupInput): StartupPhase {
  // A throw outranks everything: there is nothing to wait for and something to say.
  if (input.renderError) return 'FAILED';
  if (input.fontsLoaded) return 'READY';
  if (input.fontError || input.timedOut) return 'DEGRADED';
  return 'WAITING';
}

/**
 * The whole safety property, in one line: the splash is hidden in every phase except the bounded
 * wait. A new phase added later is hiding the splash unless somebody deliberately says otherwise.
 */
export function splashShouldHide(phase: StartupPhase): boolean {
  return phase !== 'WAITING';
}

/** Whether the navigator may mount. FAILED renders the error state instead of the app. */
export function canRenderApp(phase: StartupPhase): boolean {
  return phase === 'READY' || phase === 'DEGRADED';
}
