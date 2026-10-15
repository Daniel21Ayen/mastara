// apps/admin-web/src/app/(portal)/scan-to-pdf/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { ScansListScreen } from '@/modules/scans';

export const metadata: Metadata = { title: adminText('admin.nav.scanToPdf') };

export default function Page() {
  return <ScansListScreen />;
}
