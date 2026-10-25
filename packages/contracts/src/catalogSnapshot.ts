// packages/contracts/src/catalogSnapshot.ts
import { z } from 'zod';

export const catalogItemKindSchema = z.enum([
  'COURSE',
  'MODULE',
  'TOPIC',
  'EXAM',
  'QUIZ_CHAPTER',
  'COC_SET',
]);
export type CatalogItemKind = z.infer<typeof catalogItemKindSchema>;

export const catalogItemHeaderSchema = z.object({
  id: z.string(),
  kind: catalogItemKindSchema,
  courseId: z.string(),
  parentId: z.string().nullable().optional(),
  title: z.union([
    z.string(),
    z.object({
      en: z.string(),
      am: z.string().optional(),
    }),
  ]),
  order: z.number().int(),
  type: z.string().nullable().optional(),
  isFree: z.boolean(),
  updatedAt: z.union([z.string(), z.number()]),
  meta: z.record(z.any()).nullable().optional(),
});
export type CatalogItemHeader = z.infer<typeof catalogItemHeaderSchema>;

export const catalogSnapshotResponseSchema = z.object({
  version: z.string(),
  items: z.array(catalogItemHeaderSchema),
  deletedIds: z.array(z.string()),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
});
export type CatalogSnapshotResponse = z.infer<typeof catalogSnapshotResponseSchema>;

export const catalogSnapshotQuerySchema = z.object({
  since: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});
export type CatalogSnapshotQuery = z.infer<typeof catalogSnapshotQuerySchema>;
