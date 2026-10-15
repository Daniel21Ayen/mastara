// apps/admin-web/src/app/(portal)/catalog/programs/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { ProgramsScreen } from '@/modules/catalog';

export const metadata: Metadata = { title: adminText('admin.catalog.tab.programs') };

export default function Page() {
  return <ProgramsScreen />;
}
