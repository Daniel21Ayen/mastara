// apps/admin-web/src/core/network/ApiError.ts
import type { AdminErrorCode } from '@mastara/domain';

/** Error with a stable code from `@mastara/domain`; the real API returns the same codes. */
export class ApiError extends Error {
  readonly code: AdminErrorCode;

  constructor(code: AdminErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function isApiError(error: unknown, code?: AdminErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
