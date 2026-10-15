// apps/admin-web/src/app/(portal)/audit/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { ComingSoonScreen } from '@/modules/coming-soon';

export const metadata: Metadata = { title: adminText('admin.nav.audit') };

export default function Page() {
  return <ComingSoonScreen titleKey="admin.nav.audit" phase="F11h" />;
}
