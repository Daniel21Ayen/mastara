// packages/contracts/src/user.ts
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Phone number or email the student signed up with. */
  identifier: z.string(),
});

export type User = z.infer<typeof userSchema>;
