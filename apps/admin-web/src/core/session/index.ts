// apps/admin-web/src/core/session/index.ts
// Client-safe exports only. Server code imports `./readSession`, and `middleware.ts` imports `./cookie`.
export { SessionProvider, useAdminSession } from './SessionProvider';
export { clearSessionCookie, writeSessionCookie } from './browserCookie';
export { decodeSession, encodeSession, safeNextPath, SESSION_COOKIE } from './cookie';
export type { AdminSession } from './cookie';
