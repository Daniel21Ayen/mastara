// apps/admin-web/src/app/(portal)/dashboard/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { DashboardScreen } from '@/modules/dashboard';

export const metadata: Metadata = { title: adminText('admin.dashboard.title') };

export default function DashboardPage() {
  return <DashboardScreen />;
}
