// packages/contracts/src/auth.ts
import { z } from 'zod';

import { userSchema } from './user';
import { VALIDATION } from './validation';

const ETHIOPIAN_PHONE = /^(\+251|251|0)?9\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const identifierSchema = z
  .string()
  .trim()
  .refine((value) => ETHIOPIAN_PHONE.test(value) || EMAIL.test(value), {
    message: VALIDATION.identifier,
  });

export const passwordSchema = z.string().min(6, { message: VALIDATION.password });

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: passwordSchema,
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, { message: VALIDATION.name }),
});

/** Fields a student may change in Profile > Edit. */
export const editAccountSchema = registerSchema.pick({ name: true, identifier: true });

export const authResultSchema = z.object({
  user: userSchema,
  token: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type EditAccountInput = z.infer<typeof editAccountSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
