// apps/admin-web/src/app/(portal)/catalog/semesters/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { SemestersScreen } from '@/modules/catalog';

export const metadata: Metadata = { title: adminText('admin.catalog.tab.semesters') };

export default function Page() {
  return <SemestersScreen />;
}
