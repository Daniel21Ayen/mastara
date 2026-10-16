// apps/admin-web/src/modules/payments/components/ReceiptViewer.tsx
'use client';

import type { AdminPayment } from '@mastara/contracts';
import { useState } from 'react';

import { formatDate } from '@/core/format';
import { adminText } from '@/core/i18n';
import { Button } from '@/shared/ui';

import { amountText } from '../lib/paymentText';

import styles from './Payments.module.css';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

/**
 * The receipt image with zoom and rotate. The mock draws a sample receipt from the payment's own
 * details; the backend phase serves the student's uploaded screenshot here instead.
 */
export function ReceiptViewer({ payment }: { payment: AdminPayment }) {
  const [zoom, setZoom] = useState(1);
  const [turns, setTurns] = useState(0);

  const rows: Array<[string, string]> = [
    [adminText('admin.payments.receipt.from'), payment.studentName],
    [adminText('admin.payments.receipt.to'), adminText('admin.payments.receipt.account')],
    [adminText('admin.payments.receipt.amount'), amountText(payment.amount)],
    [adminText('admin.payments.receipt.reference'), payment.reference],
    [adminText('admin.payments.receipt.date'), formatDate(payment.createdAt)],
  ];

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar} role="group" aria-label={adminText('admin.payments.receipt.tools')}>
        <Button
          variant="outline"
          aria-label={adminText('admin.payments.receipt.zoomOut')}
          disabled={zoom <= ZOOM_MIN}
          onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP))}
        >
          −
        </Button>
        <span className={styles.zoomText} aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          aria-label={adminText('admin.payments.receipt.zoomIn')}
          disabled={zoom >= ZOOM_MAX}
          onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP))}
        >
          +
        </Button>
        <Button
          variant="outline"
          aria-label={adminText('admin.payments.receipt.rotateLeft')}
          onClick={() => setTurns((value) => value - 1)}
        >
          ↺
        </Button>
        <Button
          variant="outline"
          aria-label={adminText('admin.payments.receipt.rotateRight')}
          onClick={() => setTurns((value) => value + 1)}
        >
          ↻
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setZoom(1);
            setTurns(0);
          }}
        >
          {adminText('admin.payments.receipt.reset')}
        </Button>
      </div>
      <div className={styles.stage}>
        <div
          className={styles.paper}
          role="img"
          aria-label={adminText('admin.payments.receipt.alt', { name: payment.studentName })}
          data-zoom={zoom}
          data-turns={turns}
          style={{ transform: `rotate(${turns * 90}deg) scale(${zoom})` }}
        >
          <p className={styles.paperTitle}>{adminText(`admin.payments.method.${payment.method}`)}</p>
          <p className={styles.paperOk}>{adminText('admin.payments.receipt.success')}</p>
          <dl className={styles.paperRows}>
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
