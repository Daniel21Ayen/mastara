import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { adminText } from '@/core/i18n';
import { StateMessage } from '@/shared/ui';

export const metadata: Metadata = { title: adminText('admin.nav.scanToPdf') };

const ScanWizardScreen = dynamic(
  () => import('@/modules/scans').then((m) => m.ScanWizardScreen),
  {
    loading: () => <StateMessage>{adminText('admin.common.loading')}</StateMessage>,
  },
);

export default function Page() {
  return <ScanWizardScreen />;
}
