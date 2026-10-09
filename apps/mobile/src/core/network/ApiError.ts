// apps/mobile/src/core/network/ApiError.ts
import type { ErrorCode } from '@mastara/domain';

/** Error with a stable code from `@mastara/domain`; the real API returns the same codes. */
export class ApiError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function isApiError(error: unknown, code?: ErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
