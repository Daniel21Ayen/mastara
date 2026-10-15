// apps/admin-web/src/shared/ui/DescriptionList.tsx
import type { ReactNode } from 'react';

import styles from './DescriptionList.module.css';

export interface DescriptionRow {
  label: string;
  value: ReactNode;
}

/** Label on the left, value on the right, one row each (profile, device and review panels). */
export function DescriptionList({ rows }: { rows: readonly DescriptionRow[] }) {
  return (
    <dl className={styles.list}>
      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <dt className={styles.label}>{row.label}</dt>
          <dd className={styles.value}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
