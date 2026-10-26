// apps/admin-web/src/app/(portal)/admins/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { AdminsAndRolesScreen } from '@/modules/admins';

export const metadata: Metadata = { title: adminText('admin.nav.admins') };

export default function Page() {
  return <AdminsAndRolesScreen />;
}
