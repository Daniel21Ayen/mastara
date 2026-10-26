// packages/contracts/src/catalog.ts
import {
  ALL_UNIVERSITIES,
  CATALOG_STATUSES,
  COURSE_ACCENTS,
  FREE_TRIAL_MAX_ITEMS,
  isValidCourseCode,
  STREAMS,
  type CatalogStatus,
} from '@mastara/domain';
import { z } from 'zod';

import { reasonSchema } from './students';
import { VALIDATION } from './validation';

/** Admin-only catalog messages (i18n keys in `packages/i18n/src/admin/en.json`). */
export const CATALOG_VALIDATION = {
  courseCode: 'validation.courseCode',
  title: 'validation.title',
  shortName: 'validation.shortName',
  freeTrialItems: 'validation.freeTrialItems',
} as const;

const status = z.enum(CATALOG_STATUSES);
const required = z.string().min(1, { message: VALIDATION.required });

// ---- read shapes (what the portal lists) ----

export const adminUniversitySchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  /** Address of the university logo. Without one the portal draws the short name in a badge. */
  logoUrl: z.string().optional(),
  status,
  programCount: z.number().int().min(0),
});

export const adminProgramSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  universityShortName: z.string(),
  name: z.string(),
  status,
  courseCount: z.number().int().min(0),
});

export const adminSemesterSchema = z.object({
  id: z.string(),
  programId: z.string(),
  programName: z.string(),
  universityShortName: z.string(),
  number: z.union([z.literal(1), z.literal(2)]),
  status,
  courseCount: z.number().int().min(0),
  publishedCourseCount: z.number().int().min(0),
});

export const adminCourseSchema = z.object({
  id: z.string(),
  semesterId: z.string(),
  /** Empty for a course that is open to every university (`universityId` is ALL). */
  programId: z.string().nullable(),
  programName: z.string().nullable(),
  /** A university ID, or ALL for a course every university can use. */
  universityId: z.string(),
  universityShortName: z.string(),
  semesterNumber: z.union([z.literal(1), z.literal(2)]),
  code: z.string(),
  title: z.string(),
  stream: z.enum(STREAMS),
  accent: z.string().default('blue'),
  icon: z.string().default('book'),
  freeAccess: z.boolean().default(false),
  /** True when the course has free-trial items: unpaid students can see it and use those items. */
  promotional: z.boolean(),
  /** How many items of this course unpaid students can open. Set when the course is saved. */
  freeTrialItems: z.number().int().min(0),
  status,
});

export const courseListQuerySchema = z.object({
  /** Matches code or title. */
  q: z.string().optional(),
  universityId: z.string().optional(),
  programId: z.string().optional(),
  semesterNumber: z.union([z.literal(1), z.literal(2)]).optional(),
  stream: z.enum(STREAMS).optional(),
  status: status.optional(),
  page: z.number().int().min(1).default(1),
});

export const courseListResultSchema = z.object({
  items: z.array(adminCourseSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageCount: z.number().int().min(1),
});

// ---- write shapes ----

const courseFields = {
  code: z.string().trim().refine(isValidCourseCode, { message: CATALOG_VALIDATION.courseCode }),
  title: z.string().trim().min(3, { message: CATALOG_VALIDATION.title }),
  stream: z.enum(STREAMS),
  accent: z.string().default('blue').optional(),
  icon: z.string().default('book').optional(),
  freeAccess: z.boolean().default(false).optional(),
  freeTrialItems: z
    .number({ message: CATALOG_VALIDATION.freeTrialItems })
    .int({ message: CATALOG_VALIDATION.freeTrialItems })
    .min(0, { message: CATALOG_VALIDATION.freeTrialItems })
    .max(FREE_TRIAL_MAX_ITEMS, { message: CATALOG_VALIDATION.freeTrialItems }),
  status,
};

const semesterNumber = z.union([z.literal(1), z.literal(2)]);

/**
 * A course belongs to one semester of one program, or to Semester 1 or 2 of every university
 * (`universityId` ALL, no program).
 */
export const createCourseSchema = z
  .object({
    universityId: required,
    semesterId: z.string().optional(),
    semesterNumber: semesterNumber.optional(),
    ...courseFields,
  })
  .superRefine((value, ctx) => {
    if (value.universityId === ALL_UNIVERSITIES) {
      if (value.semesterNumber === undefined) {
        ctx.addIssue({ code: 'custom', path: ['semesterNumber'], message: VALIDATION.required });
      }
    } else if (!value.semesterId) {
      ctx.addIssue({ code: 'custom', path: ['semesterId'], message: VALIDATION.required });
    }
  });

/** The semester of a course cannot change. `reason` is required when a published course goes back to draft. */
export const updateCourseSchema = z.object({
  ...courseFields,
  reason: reasonSchema.optional(),
});

const nameField = z.string().trim().min(2, { message: VALIDATION.name });

export const universityInputSchema = z.object({
  name: nameField,
  shortName: z
    .string()
    .trim()
    .min(2, { message: CATALOG_VALIDATION.shortName })
    .max(12, { message: CATALOG_VALIDATION.shortName }),
  status,
  reason: reasonSchema.optional(),
});

export const programInputSchema = z.object({
  universityId: required,
  name: nameField,
  status,
  reason: reasonSchema.optional(),
});

/** Turning a semester on or off. Taking it off asks for a reason. */
export const semesterStatusSchema = z.object({ status, reason: reasonSchema.optional() });

export type SemesterStatusInput = z.infer<typeof semesterStatusSchema>;
export type AdminUniversity = z.infer<typeof adminUniversitySchema>;
export type AdminProgram = z.infer<typeof adminProgramSchema>;
export type AdminSemester = z.infer<typeof adminSemesterSchema>;
export type AdminCourse = z.infer<typeof adminCourseSchema>;
export type CourseListQuery = z.input<typeof courseListQuerySchema>;
export type CourseListResult = z.infer<typeof courseListResultSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type UniversityInput = z.infer<typeof universityInputSchema>;
export type ProgramInput = z.infer<typeof programInputSchema>;
export type { CatalogStatus };
