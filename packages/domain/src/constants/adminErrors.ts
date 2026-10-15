// packages/domain/src/constants/adminErrors.ts

/**
 * Error codes the admin portal throws and shows. They live here, not in the shared `errors.ts`, so the
 * admin phases never overwrite the student app's `ERROR_CODES` (for example `CONTENT_NOT_DOWNLOADED`).
 * The string values equal the shared codes, so the real API can return one set of codes for both apps.
 */
export const ADMIN_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_STATE: 'INVALID_STATE',
  IDENTIFIER_DUPLICATE: 'IDENTIFIER_DUPLICATE',
  CODE_DUPLICATE: 'CODE_DUPLICATE',
  NAME_DUPLICATE: 'NAME_DUPLICATE',
  /** Something still depends on the item (programs, courses or students), so it cannot be deleted. */
  IN_USE: 'IN_USE',
} as const;

export type AdminErrorCode = (typeof ADMIN_ERROR_CODES)[keyof typeof ADMIN_ERROR_CODES];
