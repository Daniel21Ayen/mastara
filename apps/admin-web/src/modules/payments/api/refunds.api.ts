// apps/admin-web/src/modules/payments/api/refunds.api.ts
import type { AdminRefund, RefundListResult } from '@mastara/contracts';
import { httpClient } from '@/core/network';

export interface RefundListParams {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface RequestRefundInput {
  orderId: string;
  reason: string;
}

export interface DecideRefundInput {
  action: 'APPROVE' | 'REJECT';
  reason?: string;
  payoutReference?: string;
}

export interface PayoutRefundInput {
  payoutReference: string;
  paidOutAt?: string;
}

export const refundsApi = {
  async list(params: RefundListParams = {}): Promise<RefundListResult> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.q && params.q.trim()) qs.set('q', params.q.trim());
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));

    const url = `/admin/refunds${qs.toString() ? `?${qs.toString()}` : ''}`;
    return httpClient.get<RefundListResult>(url);
  },

  async request(input: RequestRefundInput): Promise<AdminRefund> {
    return httpClient.post<AdminRefund>('/admin/refunds/request', input);
  },

  async decide(id: string, input: DecideRefundInput): Promise<AdminRefund> {
    return httpClient.post<AdminRefund>(`/admin/refunds/${encodeURIComponent(id)}/decide`, input);
  },

  async payout(id: string, input: PayoutRefundInput): Promise<AdminRefund> {
    return httpClient.post<AdminRefund>(`/admin/refunds/${encodeURIComponent(id)}/payout`, input);
  },

  async get(id: string): Promise<AdminRefund> {
    return httpClient.get<AdminRefund>(`/admin/refunds/${encodeURIComponent(id)}`);
  },
};
