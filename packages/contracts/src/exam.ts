// packages/contracts/src/exam.ts
import { EXAM_KINDS } from '@mastara/domain';
import { z } from 'zod';

import { bilingualTextSchema } from './content';

/** A past exam of one university for one course (Mid, Final or Mock). */
export const examSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  universityId: z.string(),
  kind: z.enum(EXAM_KINDS),
  questionCount: z.number().int(),
  minutes: z.number().int(),
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
  minutes: z.number().int(),
  isFree: z.boolean(),
});

export type Exam = z.infer<typeof examSchema>;
export type CocSet = z.infer<typeof cocSetSchema>;
