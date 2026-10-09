// packages/contracts/src/quiz.ts
import { z } from 'zod';

import { bilingualTextSchema } from './content';

export const optionSchema = z.object({
  id: z.string(),
  label: bilingualTextSchema,
});

const questionBase = {
  id: z.string(),
  /** Course the question belongs to. Used for the per-course breakdown of COC results. */
  courseId: z.string().optional(),
  /** Text with inline $...$ and block $$...$$ math. */
  prompt: bilingualTextSchema,
  explanation: bilingualTextSchema.optional(),
};

export const choiceQuestionSchema = z.object({
  ...questionBase,
  type: z.enum(['SINGLE', 'TRUE_FALSE', 'MULTIPLE']),
  options: z.array(optionSchema).min(2),
  correctOptionIds: z.array(z.string()).min(1),
});

export const shortQuestionSchema = z.object({
  ...questionBase,
  type: z.literal('SHORT'),
  acceptedAnswers: z.array(z.string()).min(1),
});

export const questionSchema = z.union([choiceQuestionSchema, shortQuestionSchema]);

/** A chapter practised under Quiz 1, 2 or 3. Admin decides which chapters belong to which quiz. */
export const quizChapterSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  quizNo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  chapterNumber: z.number().int(),
  title: bilingualTextSchema,
  questionCount: z.number().int(),
  minutes: z.number().int(),
  /** Open to students without a paid entitlement (free trial). */
  isFree: z.boolean(),
});

export type Option = z.infer<typeof optionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type ChoiceQuestion = z.infer<typeof choiceQuestionSchema>;
export type QuizChapter = z.infer<typeof quizChapterSchema>;

