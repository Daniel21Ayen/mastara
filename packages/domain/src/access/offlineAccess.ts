// packages/domain/src/access/offlineAccess.ts
import { OFFLINE_GRACE_DAYS } from '../constants/sync';
import type { AccessState } from '../constants/learning';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CachedAccess {
  access: AccessState;
  daysLeft?: number;
  expiresAt?: string;
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
): { access: AccessState; daysLeft?: number; expiresAt?: string } {
  if (cached.access !== 'PAID') return { access: cached.access, expiresAt: cached.expiresAt };

  if (nowMs < cached.cachedAtMs) return { access: 'LOCKED', expiresAt: cached.expiresAt }; // clock rolled back
  if (nowMs - cached.cachedAtMs > graceDays * DAY_MS) return { access: 'LOCKED', expiresAt: cached.expiresAt }; // too long without the server

  let expiresAtMs = cached.cachedAtMs + (cached.daysLeft ?? 0) * DAY_MS;
  if (cached.expiresAt) {
    const parsed = new Date(cached.expiresAt).getTime();
    if (!Number.isNaN(parsed)) {
      expiresAtMs = parsed;
    }
  }

  if (nowMs >= expiresAtMs) return { access: 'LOCKED', expiresAt: cached.expiresAt };

  return {
    access: 'PAID',
    daysLeft: Math.max(0, Math.ceil((expiresAtMs - nowMs) / DAY_MS)),
    expiresAt: cached.expiresAt,
  };
}
