// packages/contracts/src/students.ts
import {
  DEVICE_STATUSES,
  MAX_GRANT_DAYS,
  REASON_MIN_LENGTH,
  STREAMS,
  STUDENT_ACCESS_STATES,
  STUDENT_STATUSES,
  STUDENT_STREAMS,
} from '@mastara/domain';
import { z } from 'zod';

import { identifierSchema } from './auth';
import { VALIDATION } from './validation';

/** Admin-only validation messages (i18n keys in `packages/i18n/src/admin/en.json`). */
export const ADMIN_VALIDATION = {
  reason: 'validation.reason',
  days: 'validation.days',
} as const;

const required = z.string().min(1, { message: VALIDATION.required });

export const reasonSchema = z
  .string()
  .trim()
  .min(REASON_MIN_LENGTH, { message: ADMIN_VALIDATION.reason });

export const studentSummarySchema = z.object({
  /** Primary identifier (UUID) */
  id: z.string(),
  /** Sequential readable Student ID starting at MS0001 (e.g. MS0001, MS0002) */
  studentCode: z.string().optional(),
  name: z.string(),
  /** Phone or email the student signed up with. */
  identifier: z.string(),
  universityId: z.string(),
  universityShortName: z.string(),
  stream: z.enum(STUDENT_STREAMS),
  courseCount: z.number().int().min(0),
  status: z.enum(STUDENT_STATUSES),
  device: z.enum(DEVICE_STATUSES),
  access: z.enum(STUDENT_ACCESS_STATES),
});

export const studentCourseSchema = z.object({
  courseId: z.string(),
  code: z.string(),
  title: z.string(),
  stream: z.enum(STREAMS),
  access: z.enum(STUDENT_ACCESS_STATES),
  /** ISO date-time. Only for paid and expired courses. */
  expiresAt: z.string().optional(),
});

export const studentDetailSchema = studentSummarySchema.extend({
  programName: z.string(),
  semesterNumber: z.union([z.literal(1), z.literal(2)]),
  /** ISO date-times. */
  boundAt: z.string().optional(),
  lastSeenAt: z.string().optional(),
  courses: z.array(studentCourseSchema),
});

export const studentListQuerySchema = z.object({
  /** Matches ID, name, phone or email. */
  q: z.string().optional(),
  universityId: z.string().optional(),
  stream: z.enum(STUDENT_STREAMS).optional(),
  access: z.enum(STUDENT_ACCESS_STATES).optional(),
  page: z.number().int().min(1).default(1),
});

export const studentListResultSchema = z.object({
  items: z.array(studentSummarySchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageCount: z.number().int().min(1),
});

/** Suspend, reactivate and revoke device all need only a reason. */
export const studentActionSchema = z.object({ reason: reasonSchema });

export const grantAccessSchema = z.object({
  courseId: required,
  days: z
    .number({ message: ADMIN_VALIDATION.days })
    .int({ message: ADMIN_VALIDATION.days })
    .min(1, { message: ADMIN_VALIDATION.days })
    .max(MAX_GRANT_DAYS, { message: ADMIN_VALIDATION.days }),
  reason: reasonSchema,
});

export const createStudentSchema = z.object({
  name: z.string().trim().min(2, { message: VALIDATION.name }),
  identifier: identifierSchema,
  universityId: required,
  programId: required,
  semesterId: required,
  stream: z.enum(STUDENT_STREAMS),
});

export type StudentSummary = z.infer<typeof studentSummarySchema>;
export type StudentCourse = z.infer<typeof studentCourseSchema>;
export type StudentDetail = z.infer<typeof studentDetailSchema>;
export type StudentListQuery = z.input<typeof studentListQuerySchema>;
export type StudentListResult = z.infer<typeof studentListResultSchema>;
export type StudentActionInput = z.infer<typeof studentActionSchema>;
export type GrantAccessInput = z.infer<typeof grantAccessSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
