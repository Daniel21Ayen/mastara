// apps/admin-web/src/shared/ui/StateMessage.tsx
import type { ReactNode } from 'react';

import styles from './StateMessage.module.css';

interface StateMessageProps {
  /** `alert` is announced at once by screen readers; use it for errors. */
  tone?: 'info' | 'alert';
  children: ReactNode;
}

/** Loading, empty and error text with an optional action below it. */
export function StateMessage({ tone = 'info', children }: StateMessageProps) {
  return (
    <div className={styles.message} role={tone === 'alert' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
