// packages/domain/src/access/studentAccess.ts
import type { StudentAccessState } from '../constants/admin';

/**
 * Access of one course as the admin sees it. Paid access whose end date has passed is EXPIRED.
 * `expiresAtMs` is only used for paid access.
 */
export function courseAccessState(
  stored: 'PAID' | 'PENDING' | 'FREE_TRIAL',
  expiresAtMs: number | undefined,
  nowMs: number,
): StudentAccessState {
  if (stored !== 'PAID') return stored;
  return expiresAtMs !== undefined && expiresAtMs > nowMs ? 'PAID' : 'EXPIRED';
}

/**
 * One label for the whole student: any active paid course wins, then a payment waiting for review,
 * then an expired course, otherwise the student is on the free trial.
 */
export function deriveStudentAccess(courses: readonly StudentAccessState[]): StudentAccessState {
  if (courses.includes('PAID')) return 'PAID';
  if (courses.includes('PENDING')) return 'PENDING';
  if (courses.includes('EXPIRED')) return 'EXPIRED';
  return 'FREE_TRIAL';
}
