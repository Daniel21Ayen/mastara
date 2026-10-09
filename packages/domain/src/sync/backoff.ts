// packages/domain/src/sync/backoff.ts
const BASE_MS = 2_000;
const MAX_MS = 5 * 60_000;

/** Wait before retrying a failed upload: 2 s, 4 s, 8 s ... capped at 5 minutes. */
export function retryDelayMs(attempts: number): number {
  return Math.min(MAX_MS, BASE_MS * 2 ** Math.max(0, attempts - 1));
}

export interface RetryState {
  attempts: number;
  /** When the last try happened (ms), or null if never tried. */
  lastAttemptMs: number | null;
}

/** True when the change has never been tried, or its wait time has passed. */
export function isDue(state: RetryState, nowMs: number): boolean {
  if (state.attempts === 0 || state.lastAttemptMs === null) return true;
  return nowMs - state.lastAttemptMs >= retryDelayMs(state.attempts);
}
