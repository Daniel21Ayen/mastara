// packages/domain/src/exam/timer.ts
/**
 * Exam countdown that uses only a monotonic clock (milliseconds that never go backwards and ignore
 * the phone's date and time settings). Changing the system clock therefore cannot add time.
 */
export interface TimerState {
  durationMs: number;
  elapsedMs: number;
  /** Monotonic reading at the last tick. */
  lastMonoMs: number;
}

export function startTimer(durationMs: number, monoNowMs: number): TimerState {
  return { durationMs, elapsedMs: 0, lastMonoMs: monoNowMs };
}

/** Adds the monotonic time that passed since the last tick. A reading that goes backwards adds nothing. */
export function tickTimer(state: TimerState, monoNowMs: number): TimerState {
  const passed = Math.max(0, monoNowMs - state.lastMonoMs);
  return {
    ...state,
    elapsedMs: Math.min(state.durationMs, state.elapsedMs + passed),
    lastMonoMs: monoNowMs,
  };
}

export function remainingMs(state: TimerState): number {
  return Math.max(0, state.durationMs - state.elapsedMs);
}

export function isExpired(state: TimerState): boolean {
  return remainingMs(state) === 0;
}

/** "5:07" under an hour, "1:05:07" from an hour up. Rounds up so 0:00 only shows at the very end. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
