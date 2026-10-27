// packages/contracts/src/academic.ts
import { STREAMS } from '@mastara/domain';
import { z } from 'zod';

export const universitySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Amharic name when the server or the bundled catalog has one. `name` stays the English text. */
  nameAm: z.string().optional(),
  shortName: z.string(),
});

export const programSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  name: z.string(),
  nameAm: z.string().optional(),
});

export const semesterSchema = z.object({
  id: z.string(),
  programId: z.string(),
  number: z.union([z.literal(1), z.literal(2)]),
});

export const courseSchema = z.object({
  id: z.string(),
  semesterId: z.string(),
  code: z.string(),
  title: z.string(),
  /** Amharic title when known. `title` stays the English text so older code keeps working. */
  titleAm: z.string().optional(),
  stream: z.enum(STREAMS),
});

export type University = z.infer<typeof universitySchema>;
export type Program = z.infer<typeof programSchema>;
export type Semester = z.infer<typeof semesterSchema>;
export type Course = z.infer<typeof courseSchema>;
