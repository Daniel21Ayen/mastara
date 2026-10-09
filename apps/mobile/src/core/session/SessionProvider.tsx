// apps/mobile/src/core/session/SessionProvider.tsx
import type { StudentProfile, User } from '@mastara/contracts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { setDbUser } from '@/core/db/userScope';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

import { deriveStatus } from './deriveStatus';
import type { SessionFacts, SessionStatus } from './deriveStatus';

interface SessionSnapshot {
  user: User;
  device: 'bound' | 'unknown';
  profile: StudentProfile | null;
}

interface SessionValue {
  status: SessionStatus;
  user: User | null;
  profile: StudentProfile | null;
  signIn: (user: User, profile: StudentProfile | null) => void;
  signOut: () => void;
  bindDevice: () => void;
  lockDevice: () => void;
  saveProfile: (profile: StudentProfile) => void;
  updateUser: (user: User) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

const INITIAL: SessionFacts = { hydrated: false, user: null, device: 'unknown', profile: null };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [facts, setFacts] = useState<SessionFacts>(INITIAL);

  // Rows in the local database belong to the signed-in student. Set during render so that child effects
  // (sync, saved attempts) already see the right user.
  setDbUser(facts.user?.id ?? null);

  // Restore the saved session once at start.
  useEffect(() => {
    secureStorage.getJson<SessionSnapshot>(STORAGE_KEYS.session).then((snapshot) => {
      setFacts({
        hydrated: true,
        user: snapshot?.user ?? null,
        device: snapshot?.device ?? 'unknown',
        profile: snapshot?.profile ?? null,
      });
    });
  }, []);

  // Save every change after the first restore.
  useEffect(() => {
    if (!facts.hydrated) return;
    if (!facts.user) {
      void secureStorage.remove(STORAGE_KEYS.session);
      return;
    }
    const snapshot: SessionSnapshot = {
      user: facts.user,
      device: facts.device === 'bound' ? 'bound' : 'unknown',
      profile: facts.profile,
    };
    void secureStorage.setJson(STORAGE_KEYS.session, snapshot);
  }, [facts]);

  const signIn = useCallback(
    (user: User, profile: StudentProfile | null) =>
      setFacts({ hydrated: true, user, device: 'unknown', profile }),
    [],
  );
  const signOut = useCallback(() => setFacts({ ...INITIAL, hydrated: true }), []);
  const bindDevice = useCallback(() => setFacts((prev) => ({ ...prev, device: 'bound' })), []);
  const lockDevice = useCallback(() => setFacts((prev) => ({ ...prev, device: 'locked' })), []);
  const saveProfile = useCallback((profile: StudentProfile) => setFacts((prev) => ({ ...prev, profile })), []);
  const updateUser = useCallback((user: User) => setFacts((prev) => ({ ...prev, user })), []);

  const value = useMemo<SessionValue>(
    () => ({
      status: deriveStatus(facts),
      user: facts.user,
      profile: facts.profile,
      signIn,
      signOut,
      bindDevice,
      lockDevice,
      saveProfile,
      updateUser,
    }),
    [facts, signIn, signOut, bindDevice, lockDevice, saveProfile, updateUser],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>');
  return context;
}
