// apps/mobile/src/core/timer/monotonicClock.ts
import { nativeElapsedRealtimeMs } from '../../../modules/mastara-clock';

/** Milliseconds from a clock that only moves forward and ignores the phone's date/time settings. */
export interface MonotonicClock {
  nowMs(): number;
}

/**
 * The exam clock. With the native module (development or release build) it is Android `SystemClock.elapsedRealtime()`
 * / iOS `mach_continuous_time`, which keep counting while the phone sleeps. In Expo Go, or in a build without the
 * module, it falls back to the JavaScript engine's timer, which may pause during deep sleep.
 * Never mix readings from the two sources: one app run uses one of them.
 */
export const monotonicClock: MonotonicClock = {
  nowMs: () => nativeElapsedRealtimeMs() ?? globalThis.performance.now(),
};
