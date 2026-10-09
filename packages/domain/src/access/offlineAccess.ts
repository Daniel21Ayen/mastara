// packages/domain/src/access/offlineAccess.ts
import { OFFLINE_GRACE_DAYS } from '../constants/sync';
import type { AccessState } from '../constants/learning';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CachedAccess {
  access: AccessState;
  daysLeft?: number;
  /** When the server last confirmed this access (ms). */
  cachedAtMs: number;
}

/**
 * Access to trust when the server cannot be reached. Paid access is honoured until its cached expiry,
 * but only for a limited grace period, and never if the phone's clock was set back before the cache time.
 * Free-trial and locked states do not change.
 */
export function offlineAccess(
  cached: CachedAccess,
  nowMs: number,
  graceDays: number = OFFLINE_GRACE_DAYS,
): { access: AccessState; daysLeft?: number } {
  if (cached.access !== 'PAID') return { access: cached.access };

  if (nowMs < cached.cachedAtMs) return { access: 'LOCKED' }; // clock rolled back
  if (nowMs - cached.cachedAtMs > graceDays * DAY_MS) return { access: 'LOCKED' }; // too long without the server

  const expiresAtMs = cached.cachedAtMs + (cached.daysLeft ?? 0) * DAY_MS;
  if (nowMs >= expiresAtMs) return { access: 'LOCKED' };

  return { access: 'PAID', daysLeft: Math.ceil((expiresAtMs - nowMs) / DAY_MS) };
}
