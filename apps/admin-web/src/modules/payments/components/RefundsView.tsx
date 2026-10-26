// apps/admin-web/src/modules/payments/components/RefundsView.tsx
'use client';

import React, { useEffect, useState } from 'react';
import type { AdminRefund, RefundListResult } from '@mastara/contracts';
import { formatDate } from '@/core/format';
import { adminText } from '@/core/i18n';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Modal,
  Pagination,
  StateMessage,
  TextField,
  type Column,
} from '@/shared/ui';
import { refundsApi } from '../api/refunds.api';
import styles from './Payments.module.css';

export function RefundsView() {
  const [data, setData] = useState<RefundListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestOrderId, setRequestOrderId] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const [decisionModalRefund, setDecisionModalRefund] = useState<AdminRefund | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionPayoutRef, setDecisionPayoutRef] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);

  const [payoutModalRefund, setPayoutModalRefund] = useState<AdminRefund | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadRefunds = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await refundsApi.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        q: search || undefined,
        page,
        pageSize: 10,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, [statusFilter, search, page]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestOrderId.trim() || !requestReason.trim()) return;
    setRequestSubmitting(true);
    try {
      await refundsApi.request({
        orderId: requestOrderId.trim(),
        reason: requestReason.trim(),
      });
      setRequestModalOpen(false);
      setRequestOrderId('');
      setRequestReason('');
      showNotice('Refund requested successfully. Awaiting Super Admin approval.');
      loadRefunds();
    } catch (err: any) {
      alert(err?.message || 'Failed to request refund');
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModalRefund) return;
    setDecisionSubmitting(true);
    try {
      await refundsApi.decide(decisionModalRefund.id, {
        action: decisionAction,
        reason: decisionReason.trim() || undefined,
        payoutReference: decisionPayoutRef.trim() || undefined,
      });
      setDecisionModalRefund(null);
      setDecisionReason('');
      setDecisionPayoutRef('');
      showNotice(
        decisionAction === 'APPROVE'
          ? 'Refund approved! Entitlement has been automatically revoked per FR-G64.'
          : 'Refund rejected.',
      );
      loadRefunds();
    } catch (err: any) {
      alert(err?.message || 'Failed to process refund decision');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalRefund || !payoutRef.trim()) return;
    setPayoutSubmitting(true);
    try {
      await refundsApi.payout(payoutModalRefund.id, {
        payoutReference: payoutRef.trim(),
      });
      setPayoutModalRefund(null);
      setPayoutRef('');
      showNotice('Manual payout reference recorded successfully.');
      loadRefunds();
    } catch (err: any) {
      alert(err?.message || 'Failed to record payout reference');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const getStatusTone = (st: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' => {
    switch (st) {
      case 'APPROVED':
      case 'PAID_OUT':
        return 'success';
      case 'REJECTED':
        return 'danger';
      case 'REQUESTED':
        return 'warning';
      case 'ENTITLEMENT_REVOKED':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const columns: Column<AdminRefund>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div>
          <strong>{row.studentName}</strong>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Order: {row.orderId.slice(0, 8)}...</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => `${row.amount} ETB`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={getStatusTone(row.status)}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => (
        <span title={row.reason} style={{ maxWidth: '200px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.reason}
        </span>
      ),
    },
    {
      key: 'payout',
      header: 'Payout Ref',
      render: (row) => row.payoutReference || <span style={{ color: 'var(--text-muted)' }}>Pending payout</span>,
    },
    {
      key: 'created',
      header: 'Requested At',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {row.status === 'REQUESTED' ? (
            <>
              <Button
                variant="primary"
                onClick={() => {
                  setDecisionModalRefund(row);
                  setDecisionAction('APPROVE');
                  setDecisionReason('');
                  setDecisionPayoutRef('');
                }}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDecisionModalRefund(row);
                  setDecisionAction('REJECT');
                  setDecisionReason('');
                  setDecisionPayoutRef('');
                }}
              >
                Reject
              </Button>
            </>
          ) : row.status === 'APPROVED' || row.status === 'ENTITLEMENT_REVOKED' ? (
            <Button
              variant="outline"
              onClick={() => {
                setPayoutModalRefund(row);
                setPayoutRef('');
              }}
            >
              Record Payout
            </Button>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['ALL', 'REQUESTED', 'APPROVED', 'PAID_OUT', 'REJECTED', 'ENTITLEMENT_REVOKED'].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'primary' : 'outline'}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
            >
              {st === 'ALL' ? 'All Refunds' : st.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
        <Button variant="primary" onClick={() => setRequestModalOpen(true)}>
          + Request Refund (Ops)
        </Button>
      </div>

      {actionNotice ? (
        <StateMessage tone="info">
          <span>{actionNotice}</span>
        </StateMessage>
      ) : null}

      {error ? (
        <StateMessage tone="alert">
          <span>{error}</span>
          <Button variant="outline" onClick={loadRefunds}>
            {adminText('admin.common.retry')}
          </Button>
        </StateMessage>
      ) : null}

      {loading && !data ? <StateMessage>{adminText('admin.common.loading')}</StateMessage> : null}

      {data ? (
        <Card>
          <div style={{ marginBottom: '16px', maxWidth: '350px' }}>
            <TextField
              label="Search refunds"
              placeholder="Search by student, order ID, or reference..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <DataTable
            caption="Refund requests and revocation status"
            columns={columns}
            rows={data.items}
            rowKey={(r) => r.id}
            empty="No refund requests found matching criteria."
          />

          {data.total > 0 ? (
            <Pagination
              page={data.page}
              pageCount={data.totalPages}
              shown={data.items.length}
              total={data.total}
              onPage={setPage}
            />
          ) : null}
        </Card>
      ) : null}

      {/* Request Refund Modal */}
      {requestModalOpen ? (
        <Modal
          title="Request Student Refund (Operations)"
          onClose={() => setRequestModalOpen(false)}
        >
          <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
              Operations Admin submits a refund request for an approved order with an explicit audit reason.
              Approval by Super Admin will revoke the student's entitlements (FR-G64).
            </p>
            <TextField
              label="Order ID (UUID)"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={requestOrderId}
              onChange={(e) => setRequestOrderId(e.target.value)}
              required
            />
            <TextField
              label="Refund Reason (Mandatory Audit Requirement)"
              placeholder="Reason for requesting refund (e.g. duplicate charge, withdrawal)..."
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="outline" onClick={() => setRequestModalOpen(false)} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={requestSubmitting}>
                {requestSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Decision Modal (Super Admin Approve / Reject) */}
      {decisionModalRefund ? (
        <Modal
          title={`${decisionAction === 'APPROVE' ? 'Approve' : 'Reject'} Refund · ${decisionModalRefund.studentName}`}
          onClose={() => setDecisionModalRefund(null)}
        >
          <form onSubmit={handleDecision} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--surface-subtle)', borderRadius: '6px', fontSize: '13px' }}>
              <div><strong>Amount:</strong> {decisionModalRefund.amount} ETB</div>
              <div><strong>Request Reason:</strong> {decisionModalRefund.reason}</div>
              <div><strong>Order ID:</strong> {decisionModalRefund.orderId}</div>
            </div>

            {decisionAction === 'APPROVE' ? (
              <div style={{ padding: '10px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}>
                ⚠️ <strong>Entitlement Revocation:</strong> Approving this refund will immediately revoke all courses and entitlements associated with this order per SRS 5.5 and FR-G64.
              </div>
            ) : null}

            <TextField
              label={decisionAction === 'APPROVE' ? 'Approval Note / Reason' : 'Rejection Reason'}
              placeholder="Audit explanation for this decision..."
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              required={decisionAction === 'REJECT'}
            />

            {decisionAction === 'APPROVE' ? (
              <TextField
                label="Manual Payout Transaction Reference (Optional if pending)"
                placeholder="e.g. CBE-TX-99012 or TELEBIRR-REF-348"
                value={decisionPayoutRef}
                onChange={(e) => setDecisionPayoutRef(e.target.value)}
              />
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="outline" onClick={() => setDecisionModalRefund(null)} type="button">
                Cancel
              </Button>
              <Button
                variant={decisionAction === 'APPROVE' ? 'primary' : 'outline'}
                type="submit"
                disabled={decisionSubmitting}
              >
                {decisionSubmitting ? 'Processing...' : decisionAction === 'APPROVE' ? 'Approve & Revoke Entitlements' : 'Reject Refund'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {/* Payout Modal */}
      {payoutModalRefund ? (
        <Modal
          title={`Record Manual Bank Payout · ${payoutModalRefund.studentName}`}
          onClose={() => setPayoutModalRefund(null)}
        >
          <form onSubmit={handlePayout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Payout occurs outside the system (CBE or Telebirr bank transfer). Record the external transaction receipt reference below.
            </p>
            <TextField
              label="Bank / Provider Payout Reference"
              placeholder="e.g. CBE-TX-990123"
              value={payoutRef}
              onChange={(e) => setPayoutRef(e.target.value)}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="outline" onClick={() => setPayoutModalRefund(null)} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={payoutSubmitting}>
                {payoutSubmitting ? 'Saving...' : 'Record Payout'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
