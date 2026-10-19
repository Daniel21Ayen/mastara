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

import { env } from '@/core/config/env';
import { adminText } from '@/core/i18n';
import { decidePayment, getPayment, listPayments, recordAudit } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
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

const mockPaymentsApi: PaymentsApi = {
  async list(query) {
    await simulateLatency();
    return paymentListResultSchema.parse(listPayments(query));
  },

  async get(id) {
    await simulateLatency();
    return adminPaymentSchema.parse(getPayment(id));
  },

  async decide(id, decision) {
    await simulateLatency();
    const parsed = paymentDecisionSchema.parse(decision);
    const payment = decidePayment(id, parsed);
    recordAudit({
      actor: 'ADMIN',
      action: parsed.action === 'APPROVE' ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED',
      target: `Order · ${payment.studentName}`,
      reason: parsed.action === 'REJECT' ? adminText(`admin.payments.reject.${parsed.reason}`) : undefined,
    });
    return adminPaymentSchema.parse(payment);
  },
};

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
    const payment = await httpClient.get<AdminPayment>(`/commerce/payments/${encodeURIComponent(id)}`);
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

function createPaymentsApi(): PaymentsApi {
  if (env.useMocks) return mockPaymentsApi;
  return realPaymentsApi;
}

export const paymentsApi = createPaymentsApi();
