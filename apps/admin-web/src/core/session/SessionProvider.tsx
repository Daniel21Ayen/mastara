// apps/admin-web/src/core/session/SessionProvider.tsx
'use client';

import type { AdminUser } from '@mastara/contracts';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import { clearSessionCookie } from './browserCookie';

interface SessionValue {
  user: AdminUser;
  logout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Holds the signed-in admin. The server layout reads the cookie and passes the user in. */
export function SessionProvider({ user, children }: { user: AdminUser; children: ReactNode }) {
  const router = useRouter();

  const logout = useCallback(() => {
    clearSessionCookie();
    router.replace('/login');
    router.refresh();
  }, [router]);

  const value = useMemo<SessionValue>(() => ({ user, logout }), [user, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAdminSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useAdminSession must be used inside SessionProvider');
  return value;
}
