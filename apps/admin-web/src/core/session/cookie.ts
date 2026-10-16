// apps/admin-web/src/core/session/cookie.ts
import { adminAuthResultSchema } from '@mastara/contracts';
import type { AdminAuthResult } from '@mastara/contracts';

/**
 * MOCK SESSION. The mock sign-in stores the session in a plain cookie so that `middleware.ts` and the
 * server layout can guard pages. In backend phase B2 the API sets an httpOnly cookie instead, and only
 * `readSession` changes. Nothing here is a security boundary.
 */
export const SESSION_COOKIE = 'mastara_admin_session';
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type AdminSession = AdminAuthResult;

export function encodeSession(session: AdminSession): string {
  return encodeURIComponent(JSON.stringify(session));
}

/** Returns the session in a cookie value, or null when it is missing, damaged or not an ADMIN. */
export function decodeSession(raw: string | undefined | null): AdminSession | null {
  if (!raw) return null;
  try {
    const parsed = adminAuthResultSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Only follow a `next` address that stays inside the portal (no other site, no `//host`). */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/login'))
    return fallback;
  return next;
}
