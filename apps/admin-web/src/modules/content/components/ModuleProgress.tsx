// apps/admin-web/src/modules/content/components/ModuleProgress.tsx
import type { CSSProperties } from 'react';

import { adminText } from '@/core/i18n';
import { Card, CardTitle } from '@/shared/ui';

import styles from './ModuleProgress.module.css';

/** "3/5 Modules Completed": published modules out of all modules, as a ring with the numbers in text. */
export function ModuleProgress({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <Card>
      <CardTitle>{adminText('admin.content.progress.title')}</CardTitle>
      <div className={styles.wrap}>
        <div
          className={styles.ring}
          style={{ '--percent': percent } as CSSProperties}
          role="img"
          aria-label={adminText('admin.content.progress.label', { done, total })}
        >
          <span className={styles.inner}>
            {done}/{total}
          </span>
        </div>
        <p className={styles.caption}>{adminText('admin.content.progress.caption')}</p>
      </div>
    </Card>
  );
}
