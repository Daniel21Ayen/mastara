// apps/admin-web/src/modules/content/components/NoteRow.tsx
import type { CatalogStatus, ContentLang } from '@mastara/domain';

import { agoText } from '@/core/format';
import { adminText } from '@/core/i18n';
import { Badge, Icon, RowMenu } from '@/shared/ui';
import type { RowMenuItem } from '@/shared/ui';

import styles from './NoteRow.module.css';

interface NoteRowProps {
  title: string;
  lang: ContentLang;
  moduleNumber: number;
  updatedAt: string;
  status: CatalogStatus;
  /** Names the menu button, for example "Actions for Key concepts". */
  menuLabel: string;
  menu: readonly RowMenuItem[];
}

/** One line of the Notes or Amharic Notes list. */
export function NoteRow({
  title,
  lang,
  moduleNumber,
  updatedAt,
  status,
  menuLabel,
  menu,
}: NoteRowProps) {
  return (
    <li className={styles.row}>
      <span className={styles.icon}>
        <Icon name={lang === 'am' ? 'translate' : 'note'} />
      </span>
      <span className={styles.text}>
        <span className={styles.title} lang={lang}>
          {title}
        </span>
        <span className={styles.meta}>
          {adminText('admin.content.moduleShort', { n: moduleNumber })} · {agoText(updatedAt)}
        </span>
      </span>
      <Badge tone={status === 'PUBLISHED' ? 'primary' : 'neutral'}>
        {adminText(`admin.catalog.status.${status}`)}
      </Badge>
      <RowMenu label={menuLabel} items={menu} />
    </li>
  );
}
