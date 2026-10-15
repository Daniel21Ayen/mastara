// packages/domain/src/access/offlineAccess.ts
import { OFFLINE_GRACE_DAYS } from '../constants/sync';
import type { AccessState } from '../constants/learning';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until `expiresAtMs`, rounded up so "0 days" only shows once access has really ended. */
export function daysUntil(expiresAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / DAY_MS));
}

export interface CachedAccess {
  access: AccessState;
  /** The exact moment paid access ends (ms). Sent by the server. */
  expiresAtMs?: number;
  /** Only for data saved before the server sent `expiresAtMs`: a rounded day count at `cachedAtMs`. */
  daysLeft?: number;
  expiresAt?: string;
  /** When the server last confirmed this access (ms). */
  cachedAtMs: number;
}

export interface OfflineAccessResult {
  access: AccessState;
  daysLeft?: number;
  /** ISO date-time of the exact expiry (paid access only). */
  expiresAt?: string;
}

/**
 * Access to trust when the server cannot be reached. Paid access is honoured until its exact expiry,
 * but only for a limited grace period, and never if the date was set back before the cache time.
 * `nowMs` should come from `trustedNowMs` so a date set back inside one boot gains nothing.
 * Free-trial and locked states do not change.
 */
export function offlineAccess(
  cached: CachedAccess,
  nowMs: number,
  graceDays: number = OFFLINE_GRACE_DAYS,
): OfflineAccessResult {
  if (cached.access !== 'PAID') return { access: cached.access };

  if (nowMs < cached.cachedAtMs) return { access: 'LOCKED', expiresAt: cached.expiresAt }; // clock rolled back
  if (nowMs - cached.cachedAtMs > graceDays * DAY_MS) return { access: 'LOCKED', expiresAt: cached.expiresAt }; // too long without the server

  const expiresAtMs = cached.expiresAtMs ?? cached.cachedAtMs + (cached.daysLeft ?? 0) * DAY_MS;
  if (nowMs >= expiresAtMs) return { access: 'LOCKED' };

  return { access: 'PAID', daysLeft: daysUntil(expiresAtMs, nowMs), expiresAt: new Date(expiresAtMs).toISOString() };
}
