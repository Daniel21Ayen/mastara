// apps/mobile/src/modules/exams/lib/savedExam.ts
import type { ExamSessionState } from '@mastara/domain';

/** What is saved on the phone while an exam is in progress, so it can be resumed after the app is closed. */
export interface SavedExam {
  session: ExamSessionState;
  /** Exam time used so far (monotonic), at the moment of saving. */
  elapsedMs: number;
  /** Both clocks at the moment of saving, used to work out how long the app was closed. */
  savedWallMs: number;
  savedUptimeMs: number;
}

export interface ResumeData {
  session: ExamSessionState;
  /** Time used including the time the app was closed. */
  elapsedMs: number;
}

export const examAttemptKey = (id: string): string => `exam:${id}`;
