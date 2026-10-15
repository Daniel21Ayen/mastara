// apps/admin-web/src/modules/payments/screens/PaymentReviewScreen.tsx
'use client';

import { paymentDecisionSchema } from '@mastara/contracts';
import type { AdminPayment } from '@mastara/contracts';
import { REJECT_REASONS, canDecide } from '@mastara/domain';
import type { RejectReason } from '@mastara/domain';
import Link from 'next/link';
import { useState } from 'react';

import { formatDate } from '@/core/format';
import { adminText, adminTextFor } from '@/core/i18n';
import { Button, Card, Checkbox, DescriptionList, PageHeader, SelectField, StateMessage } from '@/shared/ui';

import { paymentsApi } from '../api/payments.api';
import { PaymentStatusBadge } from '../components/PaymentBadges';
import { ReceiptViewer } from '../components/ReceiptViewer';
import { usePayment } from '../hooks/usePayments';
import { amountText, productText } from '../lib/paymentText';

import styles from '../components/Payments.module.css';

/** Our own validation keys as they are; anything else as "required". */
const messageOf = (message: string): string =>
  message.startsWith('validation.') ? adminTextFor(message) : adminText('validation.required');

/** Payment Review: the receipt on one side, the details and the decision on the other. */
export function PaymentReviewScreen({ id }: { id: string }) {
  const { data, error, loading, reload } = usePayment(id);
  const [payment, setPayment] = useState<AdminPayment | null>(null);
  const [reason, setReason] = useState<RejectReason | ''>('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const back = (
    <Link href="/commerce/payments" className={styles.back}>
      ← {adminText('admin.payments.back')}
    </Link>
  );
  const current = payment ?? data;

  if (error) {
    return (
      <>
        {back}
        <StateMessage tone="alert">
          <span>{adminText('admin.payments.notFound')}</span>
          <Button variant="outline" onClick={reload}>
            {adminText('admin.common.retry')}
          </Button>
        </StateMessage>
      </>
    );
  }
  if (loading && !current) return <StateMessage>{adminText('admin.common.loading')}</StateMessage>;
  if (!current) return null;

  const duplicate = current.duplicateOf !== null;
  const open = canDecide(current.status);
  const approveBlocked = duplicate && !acknowledged;

  async function decide(decision: unknown) {
    const parsed = paymentDecisionSchema.safeParse(decision);
    if (!parsed.success) {
      setReasonError(messageOf(parsed.error.issues[0]?.message ?? ''));
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      setPayment(await paymentsApi.decide(id, parsed.data));
    } catch {
      setFailure(adminText('admin.payments.decideFailed'));
    } finally {
      setBusy(false);
    }
  }

  const rows = [
    { label: adminText('admin.payments.review.student'), value: current.studentName },
    { label: adminText('admin.payments.review.university'), value: current.universityShortName },
    { label: adminText('admin.payments.review.product'), value: productText(current) },
    {
      label: adminText('admin.payments.review.courses'),
      value: adminText('admin.payments.review.coursesCount', { n: current.courses.length }),
    },
    { label: adminText('admin.payments.review.amount'), value: amountText(current.amount) },
    { label: adminText('admin.payments.review.method'), value: adminText(`admin.payments.method.${current.method}`) },
    { label: adminText('admin.payments.review.reference'), value: current.reference },
    { label: adminText('admin.payments.review.submitted'), value: formatDate(current.createdAt) },
    {
      label: adminText('admin.payments.review.access'),
      value: adminText('admin.payments.review.days', { n: current.durationDays }),
    },
    { label: adminText('admin.payments.review.status'), value: <PaymentStatusBadge status={current.status} /> },
  ];
  if (current.decidedAt) {
    rows.push({
      label: adminText('admin.payments.review.decided'),
      value: formatDate(current.decidedAt),
    });
  }
  if (current.rejectReason) {
    rows.push({
      label: adminText('admin.payments.review.reason'),
      value: adminText(`admin.payments.reject.${current.rejectReason}`),
    });
  }

  return (
    <>
      {back}
      <PageHeader title={adminText('admin.payments.review.title')} />
      <div className={styles.layout}>
        <Card>
          <ReceiptViewer payment={current} />
        </Card>
        <div className={styles.side}>
          <Card>
            <DescriptionList rows={rows} />
          </Card>

          {payment ? (
            <StateMessage>
              {adminText(
                payment.status === 'APPROVED'
                  ? 'admin.payments.approvedDone'
                  : 'admin.payments.rejectedDone',
                { name: payment.studentName },
              )}
            </StateMessage>
          ) : null}

          {open ? (
            <Card>
              <div className={styles.decision}>
                {duplicate ? (
                  <>
                    <p className={styles.warning} role="alert">
                      {adminText('admin.payments.duplicateWarning', { id: current.duplicateOf ?? '' })}
                    </p>
                    <Checkbox
                      label={adminText('admin.payments.duplicateConfirm')}
                      checked={acknowledged}
                      onChange={(event) => setAcknowledged(event.target.checked)}
                    />
                  </>
                ) : null}
                <SelectField
                  label={adminText('admin.payments.rejectLabel')}
                  placeholder={adminText('admin.payments.selectReason')}
                  options={REJECT_REASONS.map((value) => ({
                    value,
                    label: adminText(`admin.payments.reject.${value}`),
                  }))}
                  value={reason}
                  error={reasonError ?? undefined}
                  onChange={(event) => {
                    setReason(event.target.value as RejectReason | '');
                    setReasonError(null);
                  }}
                />
                {failure ? (
                  <p className={styles.failure} role="alert">
                    {failure}
                  </p>
                ) : null}
                <div className={styles.actions}>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => decide({ action: 'REJECT', reason: reason || undefined })}
                  >
                    {adminText('admin.payments.reject')}
                  </Button>
                  <Button disabled={busy || approveBlocked} onClick={() => decide({ action: 'APPROVE' })}>
                    {adminText('admin.payments.approve')}
                  </Button>
                </div>
                {approveBlocked ? <p className={styles.hint}>{adminText('admin.payments.approveHint')}</p> : null}
              </div>
            </Card>
          ) : (
            <p className={styles.hint}>{adminText('admin.payments.readOnly')}</p>
          )}
        </div>
      </div>
    </>
  );
}
