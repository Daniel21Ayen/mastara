// apps/admin-web/src/modules/dashboard/components/ActivityList.tsx
import type { AuditEntry } from '@mastara/contracts';
import { adminText } from '@/core/i18n';
import { agoText } from '@/core/format';

import styles from './ActivityList.module.css';

export function ActivityList({
  entries,
  now = new Date(),
}: {
  entries: readonly AuditEntry[];
  now?: Date;
}) {
  if (entries.length === 0)
    return <p className={styles.empty}>{adminText('admin.dashboard.activity.empty')}</p>;

  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.id} className={styles.item}>
          <span>
            {adminText(`admin.audit.action.${entry.action}` as any)} · {entry.target}
          </span>
          <time className={styles.time} dateTime={entry.at}>
            {agoText(entry.at, now)}
          </time>
        </li>
      ))}
    </ul>
  );
}
