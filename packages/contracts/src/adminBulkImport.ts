// packages/contracts/src/adminBulkImport.ts
import { z } from 'zod';

import { examQuestionInputSchema } from './adminExamSets';

export const bulkImportRowErrorSchema = z.object({
  row: z.number().int().min(1),
  questionId: z.string().optional(),
  field: z.string(),
  message: z.string(),
});

export const bulkQuestionImportInputSchema = z.object({
  /** Raw CSV or JSON string content */
  content: z.string().min(1, 'Import content cannot be empty'),
  /** If true, only parses and validates without modifying database */
  dryRun: z.boolean().default(true),
  /** Target Exam Set to append or attach to */
  targetExamSetId: z.string().optional(),
  /** Target Course UUID if known */
  courseId: z.string().optional(),
});

export const bulkQuestionImportResultSchema = z.object({
  totalRows: z.number().int().min(0),
  validRows: z.number().int().min(0),
  errorRows: z.number().int().min(0),
  errors: z.array(bulkImportRowErrorSchema),
  preview: z.array(examQuestionInputSchema),
  appliedCount: z.number().int().min(0),
  targetExamSetId: z.string().optional(),
});

export type BulkImportRowError = z.infer<typeof bulkImportRowErrorSchema>;
export type BulkQuestionImportInput = z.infer<typeof bulkQuestionImportInputSchema>;
export type BulkQuestionImportResult = z.infer<typeof bulkQuestionImportResultSchema>;
