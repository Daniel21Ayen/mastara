// packages/domain/src/security/maskIdentifier.ts
/**
 * Shortens a phone number or email for the on-screen watermark: enough to trace a leaked photo to one student,
 * not enough to publish the full number. "0911223344" becomes "091•••44"; "abebe@mail.com" becomes "abe•••om".
 */
export function maskIdentifier(identifier: string): string {
  const value = identifier.trim();
  if (value.length <= 5) return value.length === 0 ? '' : `${value.slice(0, 1)}•••`;
  return `${value.slice(0, 3)}•••${value.slice(-2)}`;
}
