// packages/contracts/src/learning.ts
import { ACCESS_STATES, RECENT_KINDS } from '@mastara/domain';
import { z } from 'zod';

import { courseSchema } from './academic';

/** A course in the student's list with access and progress. */
export const myCourseSchema = z.object({
  course: courseSchema,
  access: z.enum(ACCESS_STATES),
  expiresAt: z.string().optional(),
  daysLeft: z.number().int().optional(),
  chaptersDone: z.number().int().min(0),
  chaptersTotal: z.number().int().min(0),
});

export const recentItemSchema = z.object({
  id: z.string(),
  kind: z.enum(RECENT_KINDS),
  title: z.string(),
  /** Course to open for TOPIC and NOTE items. */
  courseId: z.string().optional(),
  chapterNumber: z.number().int().optional(),
  /** ISO date-time. */
  accessedAt: z.string(),
});

export const homeSummarySchema = z.object({
  continueLearning: z
    .object({
      courseId: z.string(),
      courseTitle: z.string(),
      chapterNumber: z.number().int(),
      percent: z.number().int(),
    })
    .nullable(),
  chaptersDone: z.number().int(),
  chaptersTotal: z.number().int(),
  activeProducts: z.number().int(),
  pendingProducts: z.number().int(),
  recent: z.array(recentItemSchema),
});

export type MyCourse = z.infer<typeof myCourseSchema>;
export type RecentItem = z.infer<typeof recentItemSchema>;
export type HomeSummary = z.infer<typeof homeSummarySchema>;
