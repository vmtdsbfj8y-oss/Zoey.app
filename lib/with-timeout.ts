/**
 * A deadline for a promise that might never settle.
 *
 * ==============================  WHY A REJECTION AND NOT A DEFAULT  ==============================
 *
 * A request that hangs is indistinguishable, from the screen's point of view, from one that is
 * still arriving -- so a spinner with no deadline is a spinner forever. `fetch` has no timeout of
 * its own, and an unreachable host does not fail fast; it stalls. That is exactly how Settings came
 * to sit on "Loading your settings…" indefinitely.
 *
 * Timing out REJECTS rather than resolving with a fallback, because the caller must be able to tell
 * the difference between "there is no data" and "we could not get the data". The first is a state;
 * the second needs a retry in front of a person.
 *
 * The timer is always cleared, including on the happy path, so a resolved request leaves nothing
 * pending behind it.
 */

export const DEFAULT_REQUEST_TIMEOUT_MS = 12_000;

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = DEFAULT_REQUEST_TIMEOUT_MS,
  message = 'This is taking longer than expected.'
): Promise<T> {
  // A non-positive deadline means "no deadline" rather than "reject immediately", so a caller
  // that opts out by passing 0 gets the old behaviour instead of an instant failure.
  if (!Number.isFinite(ms) || ms <= 0) return promise;

  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), ms);
  });

  return Promise.race([promise, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}
