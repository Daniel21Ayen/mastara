// apps/mobile/src/core/db/DatabaseProvider.tsx
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { getDb } from './database';

/** Opens and upgrades the database before the app renders, so no screen runs against a missing table. */
export function DatabaseProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getDb().then(() => setReady(true));
  }, []);

  return <>{ready ? children : fallback}</>;
}
