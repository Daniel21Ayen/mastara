// apps/mobile/src/modules/store/hooks/useStoreData.ts
import type { StudentStream } from '@mastara/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { useAsync } from '@/shared/hooks';

import { storeApi } from '../api/store.api';
import { usePaymentApprovalSafe } from '../sync/PaymentApprovalProvider';

const POLL_MS = 5000;

export function usePricing() {
  return useAsync(() => storeApi.getPricing());
}

export function useAccounts() {
  return useAsync(() => storeApi.getAccounts());
}

export function useBuyableCourses(semesterId: string, stream: StudentStream) {
  return useAsync(semesterId ? () => storeApi.getBuyableCourses(semesterId, stream) : null, [semesterId, stream]);
}

export function useFullCoverage(programId: string, stream: 'NATURAL' | 'SOCIAL' | 'BOTH', enabled: boolean) {
  return useAsync(enabled ? () => storeApi.getFullPackageCourses(programId, stream) : null, [programId, stream, enabled]);
}

import type { Order } from '@mastara/contracts';
import { getPendingClaims } from '../services/claimService';

/** The student's orders. Reloads when the screen regains focus, on approval broadcasts, and every few seconds while one is pending. */
export function useOrders(userId: string | undefined) {
  const fetchOrders = useCallback(async () => {
    let remoteOrders: Order[] = [];
    if (userId && userId.startsWith('MS')) {
      try {
        remoteOrders = await storeApi.getOrders(userId);
      } catch {
        remoteOrders = [];
      }
    } else if (userId) {
      try {
        remoteOrders = await storeApi.getOrders(userId);
      } catch {
        // Unregistered local users might not be on server yet
        remoteOrders = [];
      }
    }

    const pendingClaims = await getPendingClaims();
    const existingIds = new Set(remoteOrders.map((o) => o.id));

    // Convert local claims that aren't yet in remote orders to Order representations (REG-14)
    const localPendingOrders: Order[] = pendingClaims
      .filter((c) => !existingIds.has(c.orderId))
      .map((c) => ({
        id: c.orderId,
        type: 'BUNDLE',
        stream: 'NATURAL',
        courseIds: [],
        method: 'CBE_MOBILE',
        reference: c.reference,
        amount: 0,
        status: (c.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as Order['status'],
        createdAt: new Date(c.submittedAt).toISOString(),
      }));

    return [...localPendingOrders, ...remoteOrders];
  }, [userId]);

  const state = useAsync(fetchOrders, [fetchOrders]);
  const { reload } = state;
  const hasPending = state.data?.some((order) => order.status === 'PENDING') ?? false;

  useFocusEffect(useCallback(() => reload(), [reload]));
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(reload, POLL_MS);
    return () => clearInterval(interval);
  }, [hasPending, reload]);

  const approvalSync = usePaymentApprovalSafe();
  useEffect(() => {
    if (!approvalSync?.subscribeApproval) return;
    return approvalSync.subscribeApproval(() => {
      void reload();
    });
  }, [approvalSync, reload]);

  return { orders: state.data ?? [], loading: state.loading, error: state.error, reload };
}
