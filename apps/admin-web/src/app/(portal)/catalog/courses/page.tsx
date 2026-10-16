// apps/admin-web/src/app/(portal)/catalog/courses/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { CoursesScreen } from '@/modules/catalog';

export const metadata: Metadata = { title: adminText('admin.nav.courses') };

export default function Page() {
  return <CoursesScreen />;
}
