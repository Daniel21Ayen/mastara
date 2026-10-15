// apps/admin-web/src/modules/tests/components/TestUpdates.tsx
import type { TestUpdate } from '@mastara/contracts';

import { agoText } from '@/core/format';
import { adminText } from '@/core/i18n';
import { Card, CardTitle, Icon } from '@/shared/ui';

import styles from './TestUpdates.module.css';

/** "Recent Updates": the latest edited questions of the course, newest first. */
export function TestUpdates({ updates }: { updates: readonly TestUpdate[] }) {
  return (
    <Card>
      <CardTitle>{adminText('admin.content.recent.title')}</CardTitle>
      {updates.length === 0 ? (
        <p className={styles.empty}>{adminText('admin.content.recent.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {updates.map((update) => (
            <li key={update.id} className={styles.update}>
              <span className={styles.icon}>
                <Icon name="quiz" />
              </span>
              <span>
                <span className={styles.title}>
                  {adminText('admin.tests.recent.item', { title: update.title, n: update.quizNo })}
                </span>
                <span className={styles.time}>{agoText(update.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
