// packages/contracts/src/validation.ts
/** Validation messages are i18n keys; the UI translates them. Keep in sync with packages/i18n. */
export const VALIDATION = {
  required: 'validation.required',
  name: 'validation.name',
  identifier: 'validation.identifier',
  password: 'validation.password',
  reference: 'validation.reference',
  receipt: 'validation.receipt',
  subject: 'validation.subject',
  message: 'validation.message',
} as const;

export type ValidationKey = (typeof VALIDATION)[keyof typeof VALIDATION];
