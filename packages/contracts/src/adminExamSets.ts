// packages/contracts/src/adminExamSets.ts
import {
  CATALOG_STATUSES,
  EXAM_PROMPT_MAX,
  EXAM_SET_KINDS,
  EXAM_TOPIC_MAX,
  needsCourse,
  OPTIONS_MAX,
  QUESTION_FORMS,
  SET_MINUTES_MAX,
  SET_MINUTES_MIN,
  SET_QUESTIONS_MAX,
  SET_YEARS,
  STREAMS,
} from '@mastara/domain';
import { z } from 'zod';

import { examSetIdSchema } from './adminScans';
import { reasonSchema } from './students';
import { VALIDATION } from './validation';

/** Admin-only exam set messages (i18n keys in `packages/i18n/src/admin/en.json`). */
export const EXAM_SET_VALIDATION = {
  questionId: 'validation.questionId',
  prompt: 'validation.examPrompt',
  minutes: 'validation.setMinutes',
  year: 'validation.setYear',
} as const;

const status = z.enum(CATALOG_STATUSES);
const required = z.string().min(1, { message: VALIDATION.required });
const semesterNumber = z.union([z.literal(1), z.literal(2)]);

// ---- read shapes ----

const ANSWER_DESCRIPTION_MAX = 500;

/** One question of an exam set. Its ID is typed by the admin and is unique across all sets. */
export const examQuestionSchema = z.object({
  id: z.string(),
  form: z.enum(QUESTION_FORMS),
  /** Mid and Final questions name their topic. */
  topic: z.string(),
  prompt: z.string(),
  options: z.array(z.string()),
  correctOption: z.number().int().min(0).nullable(),
  trueIsCorrect: z.boolean().nullable(),
  acceptedAnswers: z.array(z.string()),
  /** Explanation shown to the student after they answer. */
  answerDescription: z.string().max(ANSWER_DESCRIPTION_MAX).optional(),
});

export const examSetSchema = z.object({
  /** The Exam Set ID typed by the admin, such as EXAM-SET-1041. */
  id: z.string(),
  kind: z.enum(EXAM_SET_KINDS),
  universityId: z.string(),
  universityName: z.string(),
  programId: z.string(),
  programName: z.string(),
  semesterNumber: semesterNumber,
  stream: z.enum(STREAMS),
  /** A COC set mixes courses, so it has none. */
  courseId: z.string().nullable(),
  courseCode: z.string().nullable(),
  courseTitle: z.string().nullable(),
  /** The year the academic year starts: 2023 means 2023 / 2024. */
  year: z.number().int(),
  isFree: z.boolean(),
  minutes: z.number().int(),
  status,
  questions: z.array(examQuestionSchema),
  updatedAt: z.string(),
});

export const examSetListQuerySchema = z.object({
  kind: z.enum(EXAM_SET_KINDS),
  status: status.optional(),
  /** Matches the set ID, a question ID, the course or the program. */
  q: z.string().optional(),
  page: z.number().int().min(1).default(1),
});

export const examSetListResultSchema = z.object({
  items: z.array(examSetSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).optional(),
  totalPages: z.number().int().min(1).optional(),
  pageCount: z.number().int().min(1),
});

// ---- write shapes ----

/** A draft may be unfinished: `setProblems` in the domain decides what publishing needs. */
export const examQuestionInputSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/, { message: EXAM_SET_VALIDATION.questionId }),
  form: z.enum(QUESTION_FORMS),
  topic: z.string().trim().max(EXAM_TOPIC_MAX),
  prompt: z.string().max(EXAM_PROMPT_MAX, { message: EXAM_SET_VALIDATION.prompt }),
  options: z.array(z.string()).max(OPTIONS_MAX),
  correctOption: z.number().int().min(0).nullable(),
  trueIsCorrect: z.boolean().nullable(),
  acceptedAnswers: z.array(z.string()).max(10),
  answerDescription: z.string().max(ANSWER_DESCRIPTION_MAX).optional(),
});

export { ANSWER_DESCRIPTION_MAX };

/**
 * Saves a whole exam set: creates it when the ID is new, otherwise replaces its details and its
 * questions. `reason` is required when a published set goes back to draft.
 */
export const examSetInputSchema = z
  .object({
    id: examSetIdSchema,
    kind: z.enum(EXAM_SET_KINDS),
    universityId: z.string(),
    programId: required,
    semesterNumber: z.union([z.literal(1), z.literal(2)], { message: VALIDATION.required }),
    stream: z.enum(STREAMS, { message: VALIDATION.required }),
    courseId: z.string().nullable(),
    year: z
      .number({ message: EXAM_SET_VALIDATION.year })
      .refine((value) => (SET_YEARS as readonly number[]).includes(value), {
        message: EXAM_SET_VALIDATION.year,
      })
      .optional(),
    isFree: z.boolean(),
    minutes: z
      .number({ message: EXAM_SET_VALIDATION.minutes })
      .int({ message: EXAM_SET_VALIDATION.minutes })
      .min(SET_MINUTES_MIN, { message: EXAM_SET_VALIDATION.minutes })
      .max(SET_MINUTES_MAX, { message: EXAM_SET_VALIDATION.minutes }),
    status,
    questions: z.array(examQuestionInputSchema).max(SET_QUESTIONS_MAX),
    reason: reasonSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.kind !== 'MOCK') {
      if (!value.universityId || value.universityId.trim() === '') {
        context.addIssue({ code: 'custom', path: ['universityId'], message: VALIDATION.required });
      }
      if (value.year === undefined) {
        context.addIssue({ code: 'custom', path: ['year'], message: EXAM_SET_VALIDATION.year });
      }
    }
    if (needsCourse(value.kind) && !value.courseId) {
      context.addIssue({ code: 'custom', path: ['courseId'], message: VALIDATION.required });
    }
  });

export type ExamQuestion = z.infer<typeof examQuestionSchema>;
export type ExamSet = z.infer<typeof examSetSchema>;
export type ExamSetListQuery = z.input<typeof examSetListQuerySchema>;
export type ExamSetListResult = z.infer<typeof examSetListResultSchema>;
export type ExamQuestionInput = z.infer<typeof examQuestionInputSchema>;
export type ExamSetInput = z.infer<typeof examSetInputSchema>;
