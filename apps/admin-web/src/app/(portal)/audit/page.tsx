// apps/admin-web/src/app/(portal)/audit/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { AuditLogScreen } from '@/modules/audit';

export const metadata: Metadata = { title: adminText('admin.nav.audit') };

export default function Page() {
  return <AuditLogScreen />;
}
