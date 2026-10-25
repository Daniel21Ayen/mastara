// apps/admin-web/src/modules/payments/api/payments.api.ts
import {
  adminPaymentSchema,
  paymentDecisionSchema,
  paymentListResultSchema,
} from '@mastara/contracts';
import type {
  AdminPayment,
  PaymentDecision,
  PaymentListQuery,
  PaymentListResult,
} from '@mastara/contracts';
import { httpClient } from '@/core/network';

/**
 * Approving a payment unlocks the student's courses; rejecting it needs a reason the student will see.
 * Only a waiting payment can be decided, and both outcomes are audited.
 */
export interface PaymentsApi {
  list(query: PaymentListQuery): Promise<PaymentListResult>;
  get(id: string): Promise<AdminPayment>;
  decide(id: string, decision: PaymentDecision): Promise<AdminPayment>;
}

export const realPaymentsApi: PaymentsApi = {
  async list(query) {
    const params = new URLSearchParams();
    if (query.status) params.set('status', query.status);
    if (query.method) params.set('method', query.method);
    if (query.q && query.q.trim()) params.set('q', query.q.trim());
    if (query.page) params.set('page', String(query.page));

    const qs = params.toString();
    const url = `/commerce/payments${qs ? `?${qs}` : ''}`;
    const result = await httpClient.get<PaymentListResult>(url);
    return paymentListResultSchema.parse(result);
  },

  async get(id) {
    const payment = await httpClient.get<AdminPayment>(
      `/commerce/payments/${encodeURIComponent(id)}`,
    );
    return adminPaymentSchema.parse(payment);
  },

  async decide(id, decision) {
    const parsed = paymentDecisionSchema.parse(decision);
    const payment = await httpClient.post<AdminPayment>(
      `/commerce/payments/${encodeURIComponent(id)}/decide`,
      parsed,
    );
    return adminPaymentSchema.parse(payment);
  },
};

export const paymentsApi: PaymentsApi = realPaymentsApi;
