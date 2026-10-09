// packages/contracts/src/content.ts
import { CONTENT_KINDS } from '@mastara/domain';
import { z } from 'zod';

/** One record holds both languages, so Notes and Amharic Notes are two views of the same content. */
export const bilingualTextSchema = z.object({
  en: z.string(),
  am: z.string(),
});

export const topicSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  kind: z.enum(CONTENT_KINDS),
  number: z.number().int(),
  title: bilingualTextSchema,
  summary: bilingualTextSchema,
  /** Text with inline $...$ and block $$...$$ math. */
  body: bilingualTextSchema,
  /** Open to students without a paid entitlement (free trial). */
  isFree: z.boolean(),
});

export type BilingualText = z.infer<typeof bilingualTextSchema>;
export type Topic = z.infer<typeof topicSchema>;
