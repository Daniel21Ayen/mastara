import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { isOnline, subscribeOnline, useOnline } from '@/core/network';
import { useSession } from '@/core/session';
import { getAccountState } from '@/modules/auth/api/auth.api';

import { outbox } from './outbox';
import { flushOutbox } from './syncWorker';
import { syncDownstreamContent } from './contentSync';
import { syncCatalog } from './catalogSync';

const isNative =
  typeof navigator !== 'undefined' &&
  (navigator as any).product === 'ReactNative';

let AppState: typeof import('react-native').AppState | null = null;
let InteractionManager: typeof import('react-native').InteractionManager | null = null;
if (isNative) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AppState = require('react-native').AppState;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    InteractionManager = require('react-native').InteractionManager;
  } catch {
    AppState = null;
    InteractionManager = null;
  }
}

const DEBOUNCE_MS = 500;
const BASE_RETRY_MS = 1000;
const MAX_BACKOFF_MS = 60_000;
const FOREGROUND_THROTTLE_MS = 3 * 60_000; // 3 minutes

function calculateBackoffWithJitter(attempt: number): number {
  const exp = Math.min(MAX_BACKOFF_MS, BASE_RETRY_MS * Math.pow(2, attempt));
  const jitter = exp * (0.8 + Math.random() * 0.4); // +/- 20% jitter
  return Math.round(jitter);
}

interface SyncValue {
  online: boolean;
  pending: number;
  /** Changes the server refused and that were set aside. */
  rejected: number;
  syncing: boolean;
  lastSyncAt: number | null;
  syncNow: () => Promise<void>;
  syncCatalogNow: (force?: boolean) => Promise<void>;
}

const SyncContext = createContext<SyncValue | null>(null);

/**
 * Event-driven sync engine:
 * 1. Outbox flushes only when phone is registered remotely (REGISTERED_REMOTE).
 * 2. Triggers on NetInfo connection change, AppState active (foreground), and outbox enqueue.
 * 3. Zero timer-based interval polling. Resilient with exponential backoff & jitter.
 * 4. Content sync is separate from the outbox.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempts = useRef(0);

  const refresh = useCallback(async () => {
    try {
      setPending(user ? await outbox.pendingCount() : 0);
      setRejected(user ? await outbox.rejectedCount() : 0);
    } catch {
      // ignore
    }
  }, [user]);

  const syncNow = useCallback(async () => {
    if (!user) return;

    // Outbox flushes ONLY after phone registration (REGISTERED_REMOTE)
    const accountState = await getAccountState();
    if (accountState !== 'REGISTERED_REMOTE') {
      // In LOCAL_ONLY mode, do not flush student data to remote server
      return;
    }

    setSyncing(true);
    try {
      const result = await flushOutbox(user.id);
      if (result.sent > 0) {
        setLastSyncAt(Date.now());
      }
      retryAttempts.current = 0;
    } catch {
      // On failure, schedule retry using exponential backoff with jitter
      if (retryAttempts.current < 5) {
        const delay = calculateBackoffWithJitter(retryAttempts.current);
        retryAttempts.current += 1;
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => {
          void syncNow().catch(() => undefined);
        }, delay);
      }
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [user, refresh]);

  // Trigger outbox on local change after short debounce
  useEffect(() => {
    void refresh();
    return outbox.subscribe(() => {
      void refresh();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => void syncNow().catch(() => undefined), DEBOUNCE_MS);
    });
  }, [refresh, syncNow]);

  const lastForegroundSync = useRef(0);

  const syncCatalogNow = useCallback(async (force = false) => {
    try {
      await syncCatalog(user?.id, force);
    } catch {
      // ignore
    }
  }, [user]);

  // Trigger sync on NetInfo changes and app foreground (active)
  useEffect(() => {
    const handleTrigger = (isForeground = false) => {
      if (isForeground) {
        const now = Date.now();
        if (now - lastForegroundSync.current < FOREGROUND_THROTTLE_MS) {
          return;
        }
        lastForegroundSync.current = now;
      }

      retryAttempts.current = 0;
      if (retryTimer.current) clearTimeout(retryTimer.current);

      // 1. Local catalog snapshot sync (metadata only)
      void syncCatalog(user?.id).catch(() => undefined);

      // 2. Downstream cached summary content sync
      void syncDownstreamContent(user?.id).catch(() => undefined);

      // 3. Outbox sync
      if (user) {
        void syncNow().catch(() => undefined);
      }
    };

    // NetInfo connectivity change subscription
    const unsubscribeNet = subscribeOnline(() => {
      if (isOnline()) {
        handleTrigger(false);
      }
    });

    // AppState foreground listener (throttled to once every 3 minutes)
    const appStateSubscription = AppState
      ? AppState.addEventListener('change', (state) => {
          if (state === 'active') {
            handleTrigger(true);
          }
        })
      : null;

    // Startup optimization: run catalog sync after first screen is drawn, never before it
    let startupTimer: ReturnType<typeof setTimeout> | null = null;
    if (online) {
      if (InteractionManager?.runAfterInteractions) {
        InteractionManager.runAfterInteractions(() => {
          handleTrigger(false);
        });
      } else {
        startupTimer = setTimeout(() => {
          handleTrigger(false);
        }, 500);
      }
    }

    return () => {
      unsubscribeNet();
      appStateSubscription?.remove();
      if (startupTimer) clearTimeout(startupTimer);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [user, online, syncNow]);

  // Sync catalog after login or user change, deferred so screen renders first
  useEffect(() => {
    if (user && online) {
      const timer = setTimeout(() => {
        void syncCatalog(user.id, true).catch(() => undefined);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user?.id, online]);

  const value = useMemo(
    () => ({ online, pending, rejected, syncing, lastSyncAt, syncNow, syncCatalogNow }),
    [online, pending, rejected, syncing, lastSyncAt, syncNow, syncCatalogNow],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside <SyncProvider>');
  return context;
}
