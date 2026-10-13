// packages/domain/src/exam/submission.ts

/** Why an exam was sent: the student pressed Submit, time ran out in the app, or time ran out while the student was away. */
export const EXAM_SUBMIT_REASONS = ['manual', 'timeout', 'overdue'] as const;
export type ExamSubmitReason = (typeof EXAM_SUBMIT_REASONS)[number];

/** Small allowance for slow saves and clock ticks when the server checks a sitting against its duration. */
export const ALLOWED_OVERRUN_MS = 5_000;

/**
 * Exam time used after the app was closed for a while. The timer keeps running while the student is away,
 * so leaving never pauses or restarts the exam. Capped at the duration.
 */
export function elapsedAfterDowntime(savedElapsedMs: number, closedForMs: number, durationMs: number): number {
  return Math.min(durationMs, Math.max(0, savedElapsedMs) + Math.max(0, closedForMs));
}

/** True when the sitting has no time left, so it must be submitted. */
export function isOverdue(elapsedMs: number, durationMs: number): boolean {
  return elapsedMs >= durationMs;
}

/** The server's check: a sitting may not be longer than the exam plus a small allowance. */
export function withinDuration(elapsedMs: number, durationMs: number): boolean {
  return elapsedMs <= durationMs + ALLOWED_OVERRUN_MS;
}

/** The admin chooses the time of every exam and COC set. These limits keep a typing mistake (0 or 9999) out of the system. */
export const EXAM_MINUTES_MIN = 5;
export const EXAM_MINUTES_MAX = 240;

export function isValidExamMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= EXAM_MINUTES_MIN && minutes <= EXAM_MINUTES_MAX;
}
