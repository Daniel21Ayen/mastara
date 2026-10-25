// packages/contracts/src/canonicalContracts.ts
import { z } from 'zod';
import { CONTENT_KINDS, EXAM_KINDS, STREAMS } from '@mastara/domain';
import { bilingualTextSchema } from './content';

export const publicationStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

// 1. University Contract
export const universityCanonicalSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string(),
  shortName: z.string(),
  logoUrl: z.string().nullable().optional(),
  status: publicationStatusSchema.optional(),
  programCount: z.number().int().optional(),
});
export type UniversityCanonical = z.infer<typeof universityCanonicalSchema>;

// 2. Program Contract
export const programCanonicalSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  universityShortName: z.string().optional(),
  code: z.string().optional(),
  name: z.string(),
  status: publicationStatusSchema.optional(),
  courseCount: z.number().int().optional(),
});
export type ProgramCanonical = z.infer<typeof programCanonicalSchema>;

// 3. Semester Contract
export const semesterCanonicalSchema = z.object({
  id: z.string(),
  programId: z.string(),
  programName: z.string().optional(),
  universityShortName: z.string().optional(),
  code: z.string().optional(),
  number: z.union([z.literal(1), z.literal(2)]),
  status: publicationStatusSchema.optional(),
  courseCount: z.number().int().optional(),
});
export type SemesterCanonical = z.infer<typeof semesterCanonicalSchema>;

// 4. Course Contract
export const courseCanonicalSchema = z.object({
  id: z.string(),
  semesterId: z.string(),
  universityId: z.string().nullable().optional(),
  programId: z.string().nullable().optional(),
  code: z.string(),
  title: z.string(),
  stream: z.enum(STREAMS),
  isPromotional: z.boolean().optional(),
  freeTrialItems: z.number().int().optional(),
  status: publicationStatusSchema.optional(),
});
export type CourseCanonical = z.infer<typeof courseCanonicalSchema>;

// 5. Content Contract
export const contentCanonicalSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  kind: z.enum(CONTENT_KINDS),
  number: z.number().int(),
  title: bilingualTextSchema,
  summary: bilingualTextSchema.optional(),
  body: bilingualTextSchema.optional(),
  isFree: z.boolean(),
});
export type ContentCanonical = z.infer<typeof contentCanonicalSchema>;

// 6. Test Contract (Practice Chapter)
export const testCanonicalSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  quizNo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  chapterNumber: z.number().int(),
  title: bilingualTextSchema,
  questionCount: z.number().int(),
  minutes: z.number().int(),
  isFree: z.boolean(),
});
export type TestCanonical = z.infer<typeof testCanonicalSchema>;

// 7. Exam Contract
export const examCanonicalSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  universityId: z.string(),
  universityShortName: z.string().optional(),
  kind: z.enum(EXAM_KINDS),
  questionCount: z.number().int(),
  minutes: z.number().int(),
  isFree: z.boolean(),
});
export type ExamCanonical = z.infer<typeof examCanonicalSchema>;

// 8. COC Contract
export const cocCanonicalSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: bilingualTextSchema,
  questionCount: z.number().int(),
  courseCount: z.number().int(),
  minutes: z.number().int(),
  isFree: z.boolean(),
});
export type CocCanonical = z.infer<typeof cocCanonicalSchema>;

// 9. Signed Entitlement Tokens Contract
export const entitlementTokenPayloadSchema = z.object({
  studentId: z.string(),
  courseIds: z.array(z.string()),
  expiresAt: z.string(),
  serverTime: z.number(),
});
export type EntitlementTokenPayload = z.infer<typeof entitlementTokenPayloadSchema>;

export const signedEntitlementTokenSchema = z.object({
  payload: entitlementTokenPayloadSchema,
  signature: z.string(),
});
export type SignedEntitlementToken = z.infer<typeof signedEntitlementTokenSchema>;
