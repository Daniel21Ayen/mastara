import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useOnline } from '@/core/network';
import { useSession } from '@/core/session';

import { outbox } from './outbox';
import { flushOutbox } from './syncWorker';

const isNative =
  typeof navigator !== 'undefined' &&
  (navigator as any).product === 'ReactNative';

let AppState: typeof import('react-native').AppState | null = null;
if (isNative) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AppState = require('react-native').AppState;
  } catch {
    AppState = null;
  }
}

const INTERVAL_MS = 30_000;
const DEBOUNCE_MS = 500;

interface SyncValue {
  online: boolean;
  pending: number;
  /** Changes the server refused and that were set aside. */
  rejected: number;
  syncing: boolean;
  lastSyncAt: number | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncValue | null>(null);

/** Keeps the outbox flowing: uploads on start, on reconnect, on return to the app, after each change and every 30 s. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setPending(user ? await outbox.pendingCount() : 0);
    setRejected(user ? await outbox.rejectedCount() : 0);
  }, [user]);

  const syncNow = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const result = await flushOutbox(user.id);
      if (result.sent > 0) setLastSyncAt(Date.now());
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [user, refresh]);

  // Upload soon after every new change, waiting a moment so quick bursts go out together.
  useEffect(() => {
    void refresh();
    return outbox.subscribe(() => {
      void refresh();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void syncNow(), DEBOUNCE_MS);
    });
  }, [refresh, syncNow]);

  // Start, reconnect and periodic uploads.
  useEffect(() => {
    if (!user || !online) return;
    void syncNow();
    const interval = setInterval(() => void syncNow(), INTERVAL_MS);
    const subscription = AppState ? AppState.addEventListener('change', (state) => state === 'active' && void syncNow()) : null;
    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, [user, online, syncNow]);

  const value = useMemo(
    () => ({ online, pending, rejected, syncing, lastSyncAt, syncNow }),
    [online, pending, rejected, syncing, lastSyncAt, syncNow],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside <SyncProvider>');
  return context;
}
