// packages/contracts/src/adminTests.ts
import {
  CATALOG_STATUSES,
  OPTIONS_MAX,
  QUESTION_FORMS,
  QUESTION_PROMPT_MAX,
  QUESTION_TITLE_MAX,
  QUIZ_MINUTES_MAX,
  QUIZ_MINUTES_MIN,
} from '@mastara/domain';
import { z } from 'zod';

import { reasonSchema } from './students';
import { VALIDATION } from './validation';

/** Admin-only test messages (i18n keys in `packages/i18n/src/admin/en.json`). */
export const TESTS_VALIDATION = {
  questionTitle: 'validation.questionTitle',
  promptLength: 'validation.promptLength',
  minutes: 'validation.quizMinutes',
} as const;

const status = z.enum(CATALOG_STATUSES);
const quizNo = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const form = z.enum(QUESTION_FORMS);

// ---- read shapes ----

export const adminQuestionSchema = z.object({
  /** Short readable ID such as Q-1001. */
  id: z.string(),
  courseId: z.string(),
  courseCode: z.string(),
  courseTitle: z.string(),
  quizNo,
  topicId: z.string(),
  /** "2.3 Worked examples". */
  topicLabel: z.string(),
  title: z.string(),
  form,
  prompt: z.string(),
  options: z.array(z.string()),
  correctOption: z.number().int().min(0).nullable(),
  trueIsCorrect: z.boolean().nullable(),
  acceptedAnswers: z.array(z.string()),
  status,
  updatedAt: z.string(),
  /** The next question of the same course and quiz, for "Next". */
  nextId: z.string().nullable(),
});

export const quizSummarySchema = z.object({
  quizNo,
  questionCount: z.number().int().min(0),
  publishedQuestionCount: z.number().int().min(0),
  minutes: z.number().int().min(1),
  status,
});

export const testUpdateSchema = z.object({
  id: z.string(),
  quizNo,
  title: z.string(),
  status,
  at: z.string(),
});

export const testsOverviewSchema = z.object({
  courseId: z.string(),
  quizzes: z.array(quizSummarySchema),
  recent: z.array(testUpdateSchema),
});

export const questionListQuerySchema = z.object({
  quizNo,
  courseId: z.string().optional(),
  form: form.optional(),
  status: status.optional(),
  /** Matches ID, title, prompt or topic. */
  q: z.string().optional(),
  page: z.number().int().min(1).default(1),
});

export const questionListResultSchema = z.object({
  items: z.array(adminQuestionSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageCount: z.number().int().min(1),
});

// ---- write shapes ----

/**
 * A draft may be unfinished: `questionProblems` in the domain decides what publishing still needs.
 * `reason` is required when a published question goes back to draft.
 */
export const questionInputSchema = z.object({
  courseId: z.string().min(1, { message: VALIDATION.required }),
  quizNo,
  topicId: z.string().min(1, { message: VALIDATION.required }),
  title: z
    .string()
    .trim()
    .min(3, { message: TESTS_VALIDATION.questionTitle })
    .max(QUESTION_TITLE_MAX, { message: TESTS_VALIDATION.questionTitle }),
  form,
  prompt: z.string().max(QUESTION_PROMPT_MAX, { message: TESTS_VALIDATION.promptLength }),
  options: z.array(z.string()).max(OPTIONS_MAX),
  correctOption: z.number().int().min(0).nullable(),
  trueIsCorrect: z.boolean().nullable(),
  acceptedAnswers: z.array(z.string()).max(10),
  status,
  reason: reasonSchema.optional(),
});

/** Time allowed and whether students see the quiz. `reason` is required when a published quiz goes back to draft. */
export const quizSettingsSchema = z.object({
  minutes: z
    .number({ message: TESTS_VALIDATION.minutes })
    .int({ message: TESTS_VALIDATION.minutes })
    .min(QUIZ_MINUTES_MIN, { message: TESTS_VALIDATION.minutes })
    .max(QUIZ_MINUTES_MAX, { message: TESTS_VALIDATION.minutes }),
  status,
  reason: reasonSchema.optional(),
});

export type AdminQuestion = z.infer<typeof adminQuestionSchema>;
export type QuizSummary = z.infer<typeof quizSummarySchema>;
export type TestUpdate = z.infer<typeof testUpdateSchema>;
export type TestsOverview = z.infer<typeof testsOverviewSchema>;
export type QuestionListQuery = z.input<typeof questionListQuerySchema>;
export type QuestionListResult = z.infer<typeof questionListResultSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type QuizSettingsInput = z.infer<typeof quizSettingsSchema>;
