// packages/domain/src/access/canOpenContent.ts
import type { AccessState } from '../constants/learning';

/**
 * Content lock rule shared by the app and the server:
 * paid courses open everything; free access courses open everything;
 * every other state opens only items flagged as free trial.
 */
export function canOpenContent(
  access: AccessState,
  isFree: boolean,
  isCourseFree?: boolean,
): boolean {
  return access === 'PAID' || Boolean(isCourseFree) || isFree;
}
