// apps/admin-web/src/modules/catalog/components/CatalogTabs.tsx
import type { AdminTranslationKey } from '@mastara/i18n';
import Link from 'next/link';

import { adminText } from '@/core/i18n';

import styles from './CatalogTabs.module.css';

const TABS: readonly { id: string; href: string; labelKey: AdminTranslationKey }[] = [
  { id: 'courses', href: '/catalog/courses', labelKey: 'admin.catalog.tab.courses' },
  { id: 'universities', href: '/catalog/universities', labelKey: 'admin.catalog.tab.universities' },
  { id: 'programs', href: '/catalog/programs', labelKey: 'admin.catalog.tab.programs' },
  { id: 'semesters', href: '/catalog/semesters', labelKey: 'admin.catalog.tab.semesters' },
];

/** Links between the four catalog pages. Each page is its own route. */
export function CatalogTabs({
  current,
}: {
  current: 'courses' | 'universities' | 'programs' | 'semesters';
}) {
  return (
    <nav className={styles.tabs} aria-label={adminText('admin.catalog.tabs')}>
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`${styles.tab} ${tab.id === current ? styles.current : ''}`}
          aria-current={tab.id === current ? 'page' : undefined}
        >
          {adminText(tab.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
