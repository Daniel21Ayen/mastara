// packages/contracts/src/profile.ts
import { STUDENT_STREAMS } from '@mastara/domain';
import { z } from 'zod';

import { VALIDATION } from './validation';

const required = z.string().min(1, { message: VALIDATION.required });

/** Where the student studies. Courses and content depend on it. */
export const academicScopeSchema = z.object({
  universityId: required,
  programId: required,
  semesterId: required,
  stream: z.enum(STUDENT_STREAMS),
});

export const studentProfileSchema = academicScopeSchema.extend({
  courseIds: z.array(z.string()),
});

export type AcademicScope = z.infer<typeof academicScopeSchema>;
export type StudentProfile = z.infer<typeof studentProfileSchema>;
