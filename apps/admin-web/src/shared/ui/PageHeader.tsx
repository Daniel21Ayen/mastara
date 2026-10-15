// apps/admin-web/src/shared/ui/PageHeader.tsx
import type { ReactNode } from 'react';

import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  /** One line under the title. */
  subtitle?: string;
  /** A status chip shown next to the title. */
  badge?: ReactNode;
  /** Buttons or filters shown at the right of the title. */
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>
          {title}
          {badge ? <span className={styles.badge}>{badge}</span> : null}
        </h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
