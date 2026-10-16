// packages/domain/src/access/grantAccess.ts
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * New end date (ms) after an admin adds `days` to a course.
 * Still-active access is extended from its current end; expired or missing access starts now.
 */
export function accessEndAfterGrant(
  currentEndMs: number | undefined,
  days: number,
  nowMs: number,
): number {
  const start = currentEndMs !== undefined && currentEndMs > nowMs ? currentEndMs : nowMs;
  return start + days * DAY_MS;
}

/** True when the course already has active paid access, so a grant is an extension. */
export function isExtension(currentEndMs: number | undefined, nowMs: number): boolean {
  return currentEndMs !== undefined && currentEndMs > nowMs;
}
