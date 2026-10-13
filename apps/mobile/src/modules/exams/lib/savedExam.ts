// apps/mobile/src/modules/exams/lib/savedExam.ts
import type { ExamSessionState } from '@mastara/domain';

/** What the sitting needs to be finished without its screen. Small, so it is saved with every answer. */
export interface SavedExamMeta {
  examId: string;
  title: string;
  minutes: number;
}

/** What is saved on the phone while an exam is in progress, so it can be resumed after the app is closed. */
export interface SavedExam {
  /** UUIDv7 made when the exam started. The server recognises a sitting sent twice by this ID. */
  sittingId: string;
  /** ISO date-time the exam started (calendar clock, informational). */
  startedAt: string;
  meta: SavedExamMeta;
  session: ExamSessionState;
  /** Exam time used so far (monotonic), at the moment of saving. */
  elapsedMs: number;
  /** Both clocks at the moment of saving, used to work out how long the app was closed. */
  savedWallMs: number;
  savedUptimeMs: number;
  /** Restart marker at the moment of saving (absent in Expo Go). */
  savedBootId?: string;
}

/** Identifies one sitting while it runs. */
export interface Sitting {
  sittingId: string;
  startedAt: string;
}

export interface ResumeData extends Sitting {
  /** The exam time the student STARTED with. If the admin changes the time later, a running sitting keeps its own. */
  minutes: number;
  session: ExamSessionState;
  /** Time used including the time the app was closed. */
  elapsedMs: number;
}

export const EXAM_ATTEMPT_PREFIX = 'exam:';
/** The questions (with answers for grading) are saved once per sitting under their own key, not with every answer. */
export const examQuestionsKey = (id: string): string => `examq:${id}`;
export const examAttemptKey = (id: string): string => `${EXAM_ATTEMPT_PREFIX}${id}`;
