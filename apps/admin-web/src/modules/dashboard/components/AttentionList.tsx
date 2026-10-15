// apps/admin-web/src/modules/dashboard/components/AttentionList.tsx
import type { DashboardSummary } from '@mastara/contracts';
import type { AdminTranslationKey } from '@mastara/i18n';
import Link from 'next/link';

import { adminText } from '@/core/i18n';
import { Badge } from '@/shared/ui';
import type { BadgeTone } from '@/shared/ui';

import styles from './AttentionList.module.css';

interface Row {
  labelKey: AdminTranslationKey;
  href: string;
  tone: BadgeTone;
  value: number;
}

/** Things that need an admin. Each row opens the page where the admin fixes it. */
export function AttentionList({ attention }: { attention: DashboardSummary['attention'] }) {
  const rows: Row[] = [
    {
      labelKey: 'admin.dashboard.attention.payments',
      href: '/commerce/payments',
      tone: 'primary',
      value: attention.paymentsWaiting,
    },
    {
      labelKey: 'admin.dashboard.attention.duplicates',
      href: '/commerce/payments',
      tone: 'danger',
      value: attention.duplicateReferences,
    },
    {
      labelKey: 'admin.dashboard.attention.scans',
      href: '/scan-to-pdf',
      tone: 'danger',
      value: attention.scanJobsFailed,
    },
    {
      labelKey: 'admin.dashboard.attention.drafts',
      href: '/content',
      tone: 'neutral',
      value: attention.contentInDraft,
    },
  ];

  return (
    <ul className={styles.list}>
      {rows.map((row) => (
        <li key={row.labelKey} className={styles.item}>
          <Link href={row.href} className={styles.link}>
            <span>{adminText(row.labelKey)}</span>
            <Badge tone={row.value === 0 ? 'neutral' : row.tone}>{row.value}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
