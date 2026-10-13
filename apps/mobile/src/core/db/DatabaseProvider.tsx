// apps/mobile/src/core/db/DatabaseProvider.tsx
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { getDb, resetDatabase } from './database';
import { runDatabaseMaintenance } from './maintenance';

export interface DatabaseErrorActions {
  /** Try to open the database again. */
  onRetry: () => void;
  /** Delete the database file and start empty. Unsent changes are lost, so ask the student first. */
  onReset: () => Promise<void>;
}

interface DatabaseProviderProps {
  children: ReactNode;
  /** Shown while the database opens. */
  fallback: ReactNode;
  /** Shown when it cannot be opened. */
  renderError: (actions: DatabaseErrorActions) => ReactNode;
}

type State = 'opening' | 'ready' | 'error';

/**
 * Opens and upgrades the database before the app renders, so no screen runs against a missing table.
 * If it cannot be opened the student sees a clear screen with Try again (and, as a last resort, Erase local data)
 * instead of a splash screen that never ends. Housekeeping runs once it is open.
 */
export function DatabaseProvider({ children, fallback, renderError }: DatabaseProviderProps) {
  const [state, setState] = useState<State>('opening');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('opening');
    getDb()
      .then(() => {
        if (cancelled) return;
        setState('ready');
        void runDatabaseMaintenance().catch(() => undefined); // housekeeping must never block the app
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const onRetry = useCallback(() => setAttempt((count) => count + 1), []);
  const onReset = useCallback(async () => {
    await resetDatabase();
    setAttempt((count) => count + 1);
  }, []);

  if (state === 'ready') return <>{children}</>;
  if (state === 'error') return <>{renderError({ onRetry, onReset })}</>;
  return <>{fallback}</>;
}
