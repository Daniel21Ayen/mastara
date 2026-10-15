// apps/admin-web/src/app/(portal)/content/tests/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { TestsOverviewScreen } from '@/modules/tests';

export const metadata: Metadata = { title: adminText('admin.nav.tests') };

export default function Page() {
  return <TestsOverviewScreen />;
}
