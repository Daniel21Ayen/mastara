import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { ScanWizardScreen } from '@/modules/scans';

export const metadata: Metadata = { title: adminText('admin.nav.scanToPdf') };

export default function Page() {
  return <ScanWizardScreen />;
}
