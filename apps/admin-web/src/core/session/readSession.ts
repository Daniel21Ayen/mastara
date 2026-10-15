// apps/admin-web/src/core/session/readSession.ts
import { cookies } from 'next/headers';

import { decodeSession, SESSION_COOKIE } from './cookie';
import type { AdminSession } from './cookie';

/** Server-side: the signed-in admin from the request cookies, or null. */
export async function readSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}
