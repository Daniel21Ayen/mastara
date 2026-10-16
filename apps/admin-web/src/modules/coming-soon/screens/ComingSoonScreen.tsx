// apps/admin-web/src/modules/coming-soon/screens/ComingSoonScreen.tsx
import type { AdminTranslationKey } from '@mastara/i18n';
import Link from 'next/link';

import { adminText } from '@/core/i18n';
import { Card, PageHeader } from '@/shared/ui';

import styles from './ComingSoonScreen.module.css';

interface ComingSoonScreenProps {
  titleKey: AdminTranslationKey;
  /** Roadmap code of the phase that builds the page, for example "F11b". */
  phase: string;
}

/** Stand-in for pages that later admin phases build, so the menu and routes already exist. */
export function ComingSoonScreen({ titleKey, phase }: ComingSoonScreenProps) {
  return (
    <>
      <PageHeader title={adminText(titleKey)} />
      <Card>
        <h2 className={styles.heading}>{adminText('admin.comingSoon.title', { phase })}</h2>
        <p className={styles.body}>{adminText('admin.comingSoon.body')}</p>
        <Link className={styles.link} href="/dashboard">
          {adminText('admin.comingSoon.back')}
        </Link>
      </Card>
    </>
  );
}
