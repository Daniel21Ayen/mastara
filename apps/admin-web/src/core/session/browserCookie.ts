// apps/admin-web/src/core/session/browserCookie.ts
'use client';

import { encodeSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './cookie';
import type { AdminSession } from './cookie';

/** Writes the admin session cookie from the browser. */
export function writeSessionCookie(session: AdminSession): void {
  document.cookie = `${SESSION_COOKIE}=${encodeSession(session)}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
