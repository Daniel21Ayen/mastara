// packages/contracts/src/exam.ts
import { EXAM_KINDS, EXAM_MINUTES_MAX, EXAM_MINUTES_MIN, EXAM_SUBMIT_REASONS } from '@mastara/domain';
import { z } from 'zod';

import { bilingualTextSchema } from './content';

/** A past exam of one university for one course (Mid, Final or Mock). */
export const examSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  universityId: z.string(),
  kind: z.enum(EXAM_KINDS),
  questionCount: z.number().int(),
  /** Set by the admin for each exam. */
  minutes: z.number().int().min(EXAM_MINUTES_MIN).max(EXAM_MINUTES_MAX),
  /** Free sample for students without a paid entitlement. */
  isFree: z.boolean(),
});

/** A COC set. COC is independent of Exams and mixes questions from all courses. */
export const cocSetSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: bilingualTextSchema,
  questionCount: z.number().int(),
  courseCount: z.number().int(),
  /** Set by the admin for each COC set. */
  minutes: z.number().int().min(EXAM_MINUTES_MIN).max(EXAM_MINUTES_MAX),
  isFree: z.boolean(),
});

export type Exam = z.infer<typeof examSchema>;
export type CocSet = z.infer<typeof cocSetSchema>;

/** One answer as uploaded. The server grades from these; the phone's score is only a preview. */
export const submittedAnswerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('choice'), optionIds: z.array(z.string()) }),
  z.object({ kind: z.literal('text'), text: z.string().max(500) }),
]);

/**
 * An exam sitting sent to the server (outbox type EXAM_SUBMITTED).
 * `sittingId` is a UUIDv7 made when the exam starts, so a re-sent sitting is recognised and counted once.
 */
export const examSubmissionSchema = z.object({
  sittingId: z.string(),
  examId: z.string(),
  title: z.string(),
  /** Question ID to answer. Questions left blank are absent. */
  answers: z.record(submittedAnswerSchema),
  reason: z.enum(EXAM_SUBMIT_REASONS),
  /** Exam length and time used, both from the phone's monotonic clock and the rule for time spent away. */
  durationMs: z.number().int().positive(),
  elapsedMs: z.number().int().nonnegative(),
  /** ISO date-times from the phone's calendar clock. Informational: the server uses its own receive time. */
  startedAt: z.string(),
  submittedAt: z.string(),
  /** The score the student saw on the phone. The server re-grades and decides. */
  provisional: z.object({ correct: z.number().int(), total: z.number().int() }),
});

export type SubmittedAnswer = z.infer<typeof submittedAnswerSchema>;
export type ExamSubmission = z.infer<typeof examSubmissionSchema>;
