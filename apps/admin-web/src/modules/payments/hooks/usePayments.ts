// apps/admin-web/src/modules/payments/hooks/usePayments.ts
'use client';

import type { PaymentListQuery } from '@mastara/contracts';

import { useAsync } from '@/shared/hooks';

import { paymentsApi } from '../api/payments.api';

export function usePayments(query: PaymentListQuery) {
  const { status, method, q, page } = query;
  return useAsync(() => paymentsApi.list(query), [status, method, q, page]);
}

export const usePayment = (id: string) => useAsync(() => paymentsApi.get(id), [id]);
