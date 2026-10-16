// apps/admin-web/src/modules/payments/lib/paymentText.ts
import type { AdminPayment } from '@mastara/contracts';

import { adminText } from '@/core/i18n';

/** "Semester Bundle · 8", "Single course", "Full Package · Social". */
export function productText(payment: Pick<AdminPayment, 'type' | 'stream' | 'courses'>): string {
  switch (payment.type) {
    case 'BUNDLE':
      return adminText('admin.payments.product.BUNDLE', { n: payment.courses.length });
    case 'SINGLE':
      return adminText('admin.payments.product.SINGLE');
    case 'FULL_STREAM':
      return adminText('admin.payments.product.FULL_STREAM', {
        stream: adminText(`admin.payments.stream.${payment.stream}`),
      });
    case 'FULL_BOTH':
      return adminText('admin.payments.product.FULL_BOTH');
  }
}

export const amountText = (amount: number): string => adminText('admin.payments.amount', { n: amount });
