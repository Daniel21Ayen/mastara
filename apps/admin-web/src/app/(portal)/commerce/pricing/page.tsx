// apps/admin-web/src/app/(portal)/commerce/pricing/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { ComingSoonScreen } from '@/modules/coming-soon';

export const metadata: Metadata = { title: adminText('admin.nav.pricing') };

export default function Page() {
  return <ComingSoonScreen titleKey="admin.nav.pricing" phase="F11h" />;
}
