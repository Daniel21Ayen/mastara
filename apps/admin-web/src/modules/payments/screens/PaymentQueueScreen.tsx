// apps/admin-web/src/modules/payments/screens/PaymentQueueScreen.tsx
'use client';

import type { AdminPayment } from '@mastara/contracts';
import { ORDER_STATUSES, PAYMENT_METHODS } from '@mastara/domain';
import type { OrderStatus, PaymentMethod } from '@mastara/domain';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { formatDate } from '@/core/format';
import { adminText, adminTextFor } from '@/core/i18n';
import {
  Button,
  ButtonLink,
  Card,
  DataTable,
  PageHeader,
  Pagination,
  SelectField,
  StateMessage,
} from '@/shared/ui';
import type { Column } from '@/shared/ui';

import { PaymentStatusBadge, ReferenceCheck } from '../components/PaymentBadges';
import { RefundsView } from '../components/RefundsView';
import { usePayments } from '../hooks/usePayments';
import { amountText, productText } from '../lib/paymentText';

import styles from '../components/Payments.module.css';

/** Payment Queue: waiting payments first, with the Approved and Rejected tabs, a method filter and Review. */
export function PaymentQueueScreen() {
  const q = useSearchParams().get('q')?.trim() || undefined;
  const [activeTab, setActiveTab] = useState<OrderStatus | 'REFUNDS'>('PENDING');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [page, setPage] = useState(1);

  const { data, error, loading, reload } = usePayments({
    status: activeTab === 'REFUNDS' ? 'PENDING' : activeTab,
    method: method || undefined,
    q,
    page,
  });

  const columns: Column<AdminPayment>[] = [
    {
      key: 'student',
      header: adminText('admin.payments.col.student'),
      render: (row) =>
        row.studentPhone ? `${row.studentName} (${row.studentPhone})` : row.studentName,
    },
    {
      key: 'product',
      header: adminText('admin.payments.col.product'),
      render: (row) => productText(row),
    },
    {
      key: 'amount',
      header: adminText('admin.payments.col.amount'),
      render: (row) => amountText(row.amount),
    },
    {
      key: 'method',
      header: adminText('admin.payments.col.method'),
      render: (row) => adminText(`admin.payments.method.${row.method}`),
    },
    {
      key: 'reference',
      header: adminText('admin.payments.col.reference'),
      render: (row) => row.reference,
    },
    {
      key: 'submitted',
      header: adminText('admin.payments.col.submitted'),
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'checks',
      header: adminText(status === 'PENDING' ? 'admin.payments.col.checks' : 'admin.payments.col.status'),
      render: (row) =>
        status === 'PENDING' ? (
          <ReferenceCheck duplicate={row.duplicateOf !== null} />
        ) : (
          <PaymentStatusBadge status={row.status} />
        ),
    },
    {
      key: 'review',
      header: adminText('admin.payments.col.review'),
      render: (row) => (
        <ButtonLink
          variant={row.status === 'PENDING' ? 'primary' : 'outline'}
          href={`/commerce/payments/${row.id}`}
          aria-label={adminText(
            row.status === 'PENDING' ? 'admin.payments.reviewNamed' : 'admin.payments.viewNamed',
            { name: row.studentName },
          )}
        >
          {adminText(row.status === 'PENDING' ? 'admin.payments.review' : 'admin.payments.view')}
        </ButtonLink>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={adminText('admin.payments.title')} />

      <div className={styles.tabs} role="group" aria-label={adminText('admin.payments.tabs')}>
        {ORDER_STATUSES.map((value) => {
          const count = data?.counts[value.toLowerCase() as 'pending' | 'approved' | 'rejected'];
          return (
            <Button
              key={value}
              variant={activeTab === value ? 'primary' : 'outline'}
              aria-pressed={activeTab === value}
              onClick={() => {
                setActiveTab(value);
                setPage(1);
              }}
            >
              {adminText(`admin.payments.tab.${value}`)}
              {value === 'PENDING' && count !== undefined ? ` (${count})` : ''}
            </Button>
          );
        })}
        <Button
          key="REFUNDS"
          variant={activeTab === 'REFUNDS' ? 'primary' : 'outline'}
          aria-pressed={activeTab === 'REFUNDS'}
          onClick={() => {
            setActiveTab('REFUNDS');
          }}
        >
          {adminText('admin.payments.tab.REFUNDS')}
        </Button>
      </div>

      {activeTab === 'REFUNDS' ? (
        <RefundsView />
      ) : (
        <>
          {error ? (
            <StateMessage tone="alert">
              <span>{adminText('admin.payments.error')}</span>
              <Button variant="outline" onClick={reload}>
                {adminText('admin.common.retry')}
              </Button>
            </StateMessage>
          ) : null}
          {loading && !data ? <StateMessage>{adminText('admin.common.loading')}</StateMessage> : null}

          {data ? (
            <Card>
              <SelectField
                label={adminText('admin.payments.filter.method')}
                placeholder={adminText('admin.payments.filter.allMethods')}
                options={PAYMENT_METHODS.map((value) => ({
                  value,
                  label: adminText(`admin.payments.method.${value}`),
                }))}
                value={method}
                onChange={(event) => {
                  setMethod(event.target.value as PaymentMethod | '');
                  setPage(1);
                }}
              />
              <DataTable
                caption={adminText('admin.payments.caption', {
                  status: adminText(`admin.payments.tab.${activeTab}`),
                })}
                columns={columns}
                rows={data.items}
                rowKey={(row) => row.id}
                empty={adminText(q ? 'admin.payments.emptySearch' : 'admin.payments.empty')}
              />
              {data.total > 0 ? (
                <Pagination
                  page={data.page}
                  pageCount={data.pageCount}
                  shown={data.items.length}
                  total={data.total}
                  onPage={setPage}
                />
              ) : null}
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}
