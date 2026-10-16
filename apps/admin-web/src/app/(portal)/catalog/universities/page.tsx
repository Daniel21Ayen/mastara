// apps/admin-web/src/app/(portal)/catalog/universities/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { UniversitiesScreen } from '@/modules/catalog';

export const metadata: Metadata = { title: adminText('admin.catalog.tab.universities') };

export default function Page() {
  return <UniversitiesScreen />;
}
