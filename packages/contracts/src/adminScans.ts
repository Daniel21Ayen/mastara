// packages/contracts/src/adminScans.ts
import {
  EXAM_KINDS,
  answerGiven,
  QUESTION_FORMS,
  SCAN_ANSWERS_MAX,
  SCAN_DESCRIPTION_MAX,
  SCAN_FILE_MAX_BYTES,
  SCAN_FILE_TYPES,
  SCAN_KINDS,
  SCAN_MATERIAL_KINDS,
  SCAN_PAGES_MAX,
  SCAN_TEXT_MAX,
  SCAN_YEAR_MAX,
  SCAN_YEAR_MIN,
  STREAMS,
} from '@mastara/domain';
import { z } from 'zod';

import { VALIDATION } from './validation';

/** Admin-only scan messages (i18n keys in `packages/i18n/src/admin/en.json`). */
export const SCAN_VALIDATION = {
  examSetId: 'validation.examSetId',
  year: 'validation.scanYear',
  pages: 'validation.scanPages',
  fileType: 'validation.scanFileType',
  fileSize: 'validation.scanFileSize',
  answer: 'validation.answerNeeded',
  title: 'validation.title',
} as const;

const required = z.string().trim().min(1, { message: VALIDATION.required });

/** A file the admin added. The mock keeps its details only; the backend phase stores the bytes. */
export const scanFileSchema = z.object({
  name: z.string().min(1),
  mime: z.enum(SCAN_FILE_TYPES, { message: SCAN_VALIDATION.fileType }),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(SCAN_FILE_MAX_BYTES, { message: SCAN_VALIDATION.fileSize }),
});

const answerFields = {
  questionId: required,
  text: z.string().max(SCAN_TEXT_MAX),
  file: scanFileSchema.nullable(),
};
const needsAnswer = (answer: { text: string; file: unknown }) => answerGiven(answer);
const answerIssue = { message: SCAN_VALIDATION.answer, path: ['text'] };

/** One answer: the question it belongs to, typed text, an attached image or PDF, or both. */
export const scanAnswerSchema = z.object(answerFields).refine(needsAnswer, answerIssue);
/** Exam answers also name the question type. */
export const examAnswerSchema = z
  .object({ ...answerFields, questionType: z.enum(QUESTION_FORMS) })
  .refine(needsAnswer, answerIssue);

const pages = z
  .array(scanFileSchema)
  .min(1, { message: SCAN_VALIDATION.pages })
  .max(SCAN_PAGES_MAX, { message: SCAN_VALIDATION.pages });

export const examSetIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]{1,19}$/, { message: SCAN_VALIDATION.examSetId });

const where = {
  universityId: required,
  programId: required,
};
const scope = {
  ...where,
  semesterNumber: z.union([z.literal(1), z.literal(2)]),
  stream: z.enum(STREAMS),
  courseId: required,
};
const titleField = z.string().trim().min(3, { message: SCAN_VALIDATION.title }).max(120, {
  message: SCAN_VALIDATION.title,
});
const description = z.string().trim().max(SCAN_DESCRIPTION_MAX);
const answers = <T extends z.ZodTypeAny>(item: T) => z.array(item).min(1).max(SCAN_ANSWERS_MAX);

// ---- write shapes ----

/** Past COC paper: where it is from, its year, and the answer for each question. */
export const cocScanSchema = z.object({
  kind: z.literal('COC'),
  pages,
  ...where,
  year: z
    .number({ message: SCAN_VALIDATION.year })
    .int({ message: SCAN_VALIDATION.year })
    .min(SCAN_YEAR_MIN, { message: SCAN_VALIDATION.year })
    .max(SCAN_YEAR_MAX, { message: SCAN_VALIDATION.year }),
  answers: answers(scanAnswerSchema),
});

/** Mid, Final or Mock exam of a course, with the question type and answer of each question. */
export const examScanSchema = z.object({
  kind: z.literal('EXAM'),
  pages,
  examKind: z.enum(EXAM_KINDS),
  examSetId: examSetIdSchema,
  ...scope,
  answers: answers(examAnswerSchema),
});

/** A scan attached to a Module, Note or Amharic Note. */
export const materialScanSchema = z.object({
  kind: z.literal('MATERIAL'),
  pages,
  materialKind: z.enum(SCAN_MATERIAL_KINDS),
  examSetId: examSetIdSchema,
  ...scope,
  topicId: required,
  title: titleField,
  description,
});

/** A scan attached to Quiz 1, 2 or 3, with the answer of each question. */
export const quizScanSchema = z.object({
  kind: z.literal('QUIZ'),
  pages,
  quizNo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  examSetId: examSetIdSchema,
  ...scope,
  topicId: required,
  title: titleField,
  description,
  answers: answers(scanAnswerSchema),
});

export const scanInputSchema = z.discriminatedUnion('kind', [
  cocScanSchema,
  examScanSchema,
  materialScanSchema,
  quizScanSchema,
]);

// ---- read shapes ----

export const adminScanSchema = z.object({
  /** Short readable ID such as SC-1001. */
  id: z.string(),
  kind: z.enum(SCAN_KINDS),
  /** Mid / Final / Mock, Module / Note / Amharic Note, 1 / 2 / 3; empty for COC. */
  subKind: z.string().nullable(),
  examSetId: z.string().nullable(),
  universityShortName: z.string(),
  programName: z.string(),
  semesterNumber: z.number().int().nullable(),
  stream: z.enum(STREAMS).nullable(),
  courseCode: z.string().nullable(),
  courseTitle: z.string().nullable(),
  year: z.number().int().nullable(),
  topicLabel: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  pages: z.array(scanFileSchema),
  answers: z.array(
    z.object({
      questionId: z.string(),
      questionType: z.enum(QUESTION_FORMS).nullable(),
      text: z.string(),
      file: scanFileSchema.nullable(),
    }),
  ),
  createdAt: z.string(),
});

export const scanListQuerySchema = z.object({
  kind: z.enum(SCAN_KINDS).optional(),
  /** Matches ID, exam set, title, course or university. */
  q: z.string().optional(),
  page: z.number().int().min(1).default(1),
});

export const scanListResultSchema = z.object({
  items: z.array(adminScanSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageCount: z.number().int().min(1),
});

/** A course the scan form offers once university, program, semester and stream are chosen. */
export const scanCourseOptionSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
});

export type ScanFile = z.infer<typeof scanFileSchema>;
export type ScanInput = z.infer<typeof scanInputSchema>;
export type AdminScan = z.infer<typeof adminScanSchema>;
export type ScanListQuery = z.input<typeof scanListQuerySchema>;
export type ScanListResult = z.infer<typeof scanListResultSchema>;
export type ScanCourseOption = z.infer<typeof scanCourseOptionSchema>;
