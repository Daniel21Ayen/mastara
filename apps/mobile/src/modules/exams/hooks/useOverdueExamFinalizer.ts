// apps/mobile/src/modules/exams/hooks/useOverdueExamFinalizer.ts
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { finalizeOverdueExams } from '../lib/finalizeOverdueExams';

/** Mount once while a student is signed in. Finishes exams that ran out of time while the student was away. */
export function useOverdueExamFinalizer(): void {
  useEffect(() => {
    const run = () => void finalizeOverdueExams().catch(() => undefined); // retried next time the app opens
    run();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && run());
    const interval = setInterval(run, 60_000); // while the app stays open on another screen
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);
}
