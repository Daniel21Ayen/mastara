// apps/admin-web/src/app/(portal)/commerce/payments/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { PaymentQueueScreen } from '@/modules/payments';

export const metadata: Metadata = { title: adminText('admin.nav.payments') };

export default function Page() {
  return <PaymentQueueScreen />;
}
