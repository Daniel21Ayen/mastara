// apps/mobile/src/modules/store/hooks/useStoreData.ts
import type { StudentStream } from '@mastara/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { useAsync } from '@/shared/hooks';

import { storeApi } from '../api/store.api';

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

/** The student's orders. Reloads when the screen regains focus and every few seconds while one is pending. */
export function useOrders(userId: string | undefined) {
  const state = useAsync(userId ? () => storeApi.getOrders(userId) : null, [userId]);
  const { reload } = state;
  const hasPending = state.data?.some((order) => order.status === 'PENDING') ?? false;

  useFocusEffect(useCallback(() => reload(), [reload]));
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(reload, POLL_MS);
    return () => clearInterval(interval);
  }, [hasPending, reload]);

  return { orders: state.data ?? [], loading: state.loading, error: state.error, reload };
}
