// apps/mobile/src/core/timer/monotonicClock.ts
/** Milliseconds from a clock that only moves forward and ignores the phone's date/time settings. */
export interface MonotonicClock {
  nowMs(): number;
}

/**
 * Uses the JavaScript engine's monotonic timer. A native Android SystemClock.elapsedRealtime() module
 * (which also counts time asleep and survives restarts) replaces this object in Phase 9 without changing callers.
 */
export const monotonicClock: MonotonicClock = {
  nowMs: () => globalThis.performance.now(),
};
