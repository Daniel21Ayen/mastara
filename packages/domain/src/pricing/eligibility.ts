// packages/domain/src/pricing/eligibility.ts
import type { AccessState } from '../constants/learning';
import { RENEWAL_WINDOW_DAYS } from '../constants/commerce';

/**
 * A course already paid for cannot be bought again until it is within the renewal window.
 * Free-trial and locked (expired) courses can always be bought.
 */
export function canBuyCourse(
  access: AccessState,
  daysLeft: number | undefined,
  renewalWindowDays: number = RENEWAL_WINDOW_DAYS,
): boolean {
  if (access !== 'PAID') return true;
  return daysLeft !== undefined && daysLeft <= renewalWindowDays;
}
