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

function createPaymentsApi(): PaymentsApi {
  if (env.useMocks) return mockPaymentsApi;
  throw new Error('The real payments API is added in the backend integration phase.');
}

export const paymentsApi = createPaymentsApi();
