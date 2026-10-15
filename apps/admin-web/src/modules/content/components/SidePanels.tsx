// apps/admin-web/src/modules/content/components/SidePanels.tsx
import type { ContentUpdate } from '@mastara/contracts';
import type { ReactNode } from 'react';

import { adminText } from '@/core/i18n';
import { agoText } from '@/core/format';
import { Card, CardTitle, Icon } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

import styles from './SidePanels.module.css';

export interface QuickAction {
  label: string;
  onSelect: () => void;
}

/** "Quick Actions": one outlined button per action. */
export function QuickActions({ actions }: { actions: readonly QuickAction[] }) {
  return (
    <Card>
      <CardTitle>{adminText('admin.content.quickActions')}</CardTitle>
      <div className={styles.actions}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={styles.action}
            onClick={action.onSelect}
          >
            <Icon name="plus" size={18} />
            {action.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

const KIND_ICON: Record<ContentUpdate['kind'], IconName> = {
  MODULE: 'module',
  NOTE: 'note',
  AMHARIC_NOTE: 'translate',
};

function updateText(update: ContentUpdate): string {
  if (update.kind === 'MODULE') return update.title;
  if (update.kind === 'NOTE')
    return adminText('admin.content.recent.note', { title: update.title });
  return adminText('admin.content.recent.amharic', { title: update.title });
}

/** "Recent Updates": the latest edits in the course, newest first. */
export function RecentUpdates({ updates, now }: { updates: readonly ContentUpdate[]; now?: Date }) {
  return (
    <Card>
      <CardTitle>{adminText('admin.content.recent.title')}</CardTitle>
      {updates.length === 0 ? (
        <p className={styles.empty}>{adminText('admin.content.recent.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {updates.map((update) => (
            <li key={`${update.kind}-${update.id}`} className={styles.update}>
              <span className={styles.icon}>
                <Icon name={KIND_ICON[update.kind]} />
              </span>
              <span>
                <span
                  className={styles.updateTitle}
                  lang={update.kind === 'AMHARIC_NOTE' ? 'am' : undefined}
                >
                  {updateText(update)}
                </span>
                <span className={styles.updateTime}>{agoText(update.at, now)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** A stack for the right-hand column on the Material pages. */
export function SideColumn({ children }: { children: ReactNode }) {
  return <div className={styles.column}>{children}</div>;
}
