// apps/admin-web/src/core/i18n/errorText.ts
import { ADMIN_ERROR_CODES } from '@mastara/domain';

import { ApiError } from '@/core/network';

import { adminText } from './adminText';

/** Plain-language message for anything an API call can throw. */
export function errorText(cause: unknown): string {
  if (cause instanceof ApiError) {
    switch (cause.code) {
      case ADMIN_ERROR_CODES.NOT_FOUND:
        return adminText('admin.error.notFound');
      case ADMIN_ERROR_CODES.INVALID_STATE:
        return adminText('admin.error.invalidState');
      case ADMIN_ERROR_CODES.IDENTIFIER_DUPLICATE:
        return adminText('admin.students.create.duplicate');
      case ADMIN_ERROR_CODES.CODE_DUPLICATE:
        return adminText('admin.catalog.error.codeDuplicate');
      case ADMIN_ERROR_CODES.NAME_DUPLICATE:
        return adminText('admin.catalog.error.nameDuplicate');
      case ADMIN_ERROR_CODES.IN_USE:
        return adminText('admin.catalog.error.inUse');
      default:
        break;
    }
  }
  return adminText('admin.error.generic');
}
