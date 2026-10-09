// apps/mobile/src/modules/exams/hooks/useExamTimer.ts
import { isExpired, remainingMs, startTimer, tickTimer } from '@mastara/domain';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { monotonicClock } from '@/core/timer';

const TICK_MS = 500;

/** Countdown driven only by the monotonic clock, so changing the phone's date or time cannot add minutes. */
export function useExamTimer(durationMs: number, initialElapsedMs = 0) {
  const [timer, setTimer] = useState(() => ({
    ...startTimer(durationMs, monotonicClock.nowMs()),
    elapsedMs: Math.min(durationMs, initialElapsedMs), // time already used before the app was closed
  }));

  useEffect(() => {
    const tick = () => setTimer((previous) => tickTimer(previous, monotonicClock.nowMs()));
    const interval = setInterval(tick, TICK_MS);
    // Catch up at once when the app returns from the background.
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && tick());

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return { remainingMs: remainingMs(timer), elapsedMs: timer.elapsedMs, expired: isExpired(timer) };
}
