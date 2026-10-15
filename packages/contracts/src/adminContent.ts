// packages/contracts/src/adminContent.ts
import { CATALOG_STATUSES, NOTE_TITLE_MAX } from '@mastara/domain';
import { z } from 'zod';

import { CATALOG_VALIDATION } from './catalog';
import { reasonSchema } from './students';
import { VALIDATION } from './validation';

/** Admin-only content messages (i18n keys in `packages/i18n/src/admin/en.json`). */
export const CONTENT_VALIDATION = {
  publishMissing: 'validation.publishMissing',
} as const;

const status = z.enum(CATALOG_STATUSES);
const required = z.string().min(1, { message: VALIDATION.required });
const title = z
  .string()
  .trim()
  .min(3, { message: CATALOG_VALIDATION.title })
  .max(NOTE_TITLE_MAX, { message: CATALOG_VALIDATION.title });

// ---- read shapes ----

/** A course the admin can open in Content (the course picker). */
export const contentCourseSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  programName: z.string(),
  universityShortName: z.string(),
});

export const adminTopicSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  number: z.number().int().min(1),
  /** "2.3": module number, then topic number. */
  code: z.string(),
  title: z.object({ en: z.string(), am: z.string() }),
});

export const adminModuleSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  number: z.number().int().min(1),
  title: z.object({ en: z.string(), am: z.string() }),
  status,
  topics: z.array(adminTopicSchema),
  /** Titles of the notes in this module, for the expanded row. */
  notes: z.array(z.object({ id: z.string(), title: z.string() })),
  updatedAt: z.string(),
});

export const adminNoteSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  moduleId: z.string(),
  moduleNumber: z.number().int().min(1),
  /** One record, two languages: Notes and Amharic Notes are two views of it. */
  title: z.object({ en: z.string(), am: z.string() }),
  /** Text with inline $...$ and block $$...$$ math. */
  body: z.object({ en: z.string(), am: z.string() }),
  /** Open to unpaid students (free trial). */
  isFree: z.boolean(),
  status,
  /** Number of the last published version; 0 until the first publish. */
  version: z.number().int().min(0),
  updatedAt: z.string(),
});

export const contentUpdateSchema = z.object({
  id: z.string(),
  kind: z.enum(['MODULE', 'NOTE', 'AMHARIC_NOTE']),
  title: z.string(),
  moduleNumber: z.number().int().min(1).optional(),
  at: z.string(),
});

export const contentSummarySchema = z.object({
  courseId: z.string(),
  moduleCount: z.number().int().min(0),
  publishedModuleCount: z.number().int().min(0),
  topicCount: z.number().int().min(0),
  noteCount: z.number().int().min(0),
  amharicNoteCount: z.number().int().min(0),
  quizCount: z.number().int().min(0),
  recent: z.array(contentUpdateSchema),
});

// ---- write shapes ----

const bilingualTitle = z.object({ en: title, am: z.string().trim().max(NOTE_TITLE_MAX) });

/** `reason` is required when a published module goes back to draft. */
export const moduleInputSchema = z.object({
  courseId: required,
  title: bilingualTitle,
  status,
  reason: reasonSchema.optional(),
});

export const topicInputSchema = z.object({
  moduleId: required,
  title: bilingualTitle,
});

/** Drafts may have empty text; `missingForPublish` in the domain decides what publishing still needs. */
export const noteInputSchema = z.object({
  courseId: required,
  moduleId: required,
  title: bilingualTitle,
  body: z.object({ en: z.string(), am: z.string() }),
  isFree: z.boolean(),
  status,
  reason: reasonSchema.optional(),
});

/** The Amharic view of an existing note. */
export const amharicNoteInputSchema = z.object({
  title: z.string().trim().min(1, { message: VALIDATION.required }).max(NOTE_TITLE_MAX),
  body: z.string().trim().min(1, { message: VALIDATION.required }),
});

export type ContentCourse = z.infer<typeof contentCourseSchema>;
export type AdminTopic = z.infer<typeof adminTopicSchema>;
export type AdminModule = z.infer<typeof adminModuleSchema>;
export type AdminNote = z.infer<typeof adminNoteSchema>;
export type ContentUpdate = z.infer<typeof contentUpdateSchema>;
export type ContentSummary = z.infer<typeof contentSummarySchema>;
export type ModuleInput = z.infer<typeof moduleInputSchema>;
export type TopicInput = z.infer<typeof topicInputSchema>;
export type NoteInput = z.infer<typeof noteInputSchema>;
export type AmharicNoteInput = z.infer<typeof amharicNoteInputSchema>;
