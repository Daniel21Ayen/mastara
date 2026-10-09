// packages/domain/src/payments/reference.ts
import type { PaymentMethod } from '../constants/commerce';

/** Trim and upper-case, so " ft24abc " and "FT24ABC" are the same reference when checking for reuse. */
export function normalizeReference(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * CBE Mobile Banking references start with FT. Other methods accept 6-20 letters or digits
 * (for example a Telebirr transaction ID). The server still checks the receipt itself.
 */
export function isValidReference(method: PaymentMethod, value: string): boolean {
  const reference = normalizeReference(value);
  if (method === 'CBE_MOBILE') return /^FT[A-Z0-9]{6,18}$/.test(reference);
  return /^[A-Z0-9]{6,20}$/.test(reference);
}
