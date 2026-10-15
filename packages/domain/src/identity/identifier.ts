// packages/domain/src/identity/identifier.ts
const ETHIOPIAN_PHONE = /^(\+251|251|0)?(9\d{8})$/;

/**
 * Key used to tell whether two sign-in identifiers are the same account.
 * Emails compare in lower case; phone numbers compare by their nine digits, so
 * "0911223344", "+251911223344" and "251 911 223 344" are one number.
 */
export function normalizeIdentifier(value: string): string {
  const trimmed = value.trim();
  const phone = ETHIOPIAN_PHONE.exec(trimmed.replace(/[\s-]/g, ''));
  return phone ? `0${phone[2]}` : trimmed.toLowerCase();
}
