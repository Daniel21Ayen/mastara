// apps/admin-web/src/app/(portal)/commerce/payments/[id]/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { PaymentReviewScreen } from '@/modules/payments';

export const metadata: Metadata = { title: adminText('admin.payments.review.title') };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentReviewScreen id={decodeURIComponent(id)} />;
}
