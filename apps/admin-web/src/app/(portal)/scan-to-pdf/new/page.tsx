// apps/admin-web/src/app/(portal)/scan-to-pdf/new/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { NewScanScreen } from '@/modules/scans';

export const metadata: Metadata = { title: adminText('admin.scans.new.title') };

export default function Page() {
  return <NewScanScreen />;
}
