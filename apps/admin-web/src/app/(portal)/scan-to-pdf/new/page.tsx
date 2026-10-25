// apps/admin-web/src/app/(portal)/scan-to-pdf/new/page.tsx
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { adminText } from '@/core/i18n';
import { StateMessage } from '@/shared/ui';

export const metadata: Metadata = { title: adminText('admin.scans.new.title') };

const NewScanScreen = dynamic(
  () => import('@/modules/scans').then((m) => m.NewScanScreen),
  {
    loading: () => <StateMessage>{adminText('admin.common.loading')}</StateMessage>,
  },
);

export default function Page() {
  return <NewScanScreen />;
}
