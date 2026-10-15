// apps/admin-web/src/modules/payments/components/PaymentBadges.tsx
import type { OrderStatus } from '@mastara/domain';

import { adminText } from '@/core/i18n';
import { Badge } from '@/shared/ui';

/** Pending, Approved or Rejected; the word is always shown, the colour only adds emphasis. */
export function PaymentStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={status === 'APPROVED' ? 'primary' : status === 'REJECTED' ? 'danger' : 'neutral'}>
      {adminText(`admin.payments.status.${status}`)}
    </Badge>
  );
}

/** The reference check: Unique, or Duplicate when an earlier payment used the same reference. */
export function ReferenceCheck({ duplicate }: { duplicate: boolean }) {
  return (
    <Badge tone={duplicate ? 'danger' : 'primary'}>
      {adminText(duplicate ? 'admin.payments.check.duplicate' : 'admin.payments.check.unique')}
    </Badge>
  );
}
