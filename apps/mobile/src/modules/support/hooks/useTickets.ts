// apps/mobile/src/modules/support/hooks/useTickets.ts
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { useSession } from '@/core/session';
import { useAsync } from '@/shared/hooks';

import { supportApi } from '../api/support.api';

const POLL_MS = 5000;

/** The student's tickets. Reloads on focus and every few seconds while one is waiting for an answer. */
export function useTickets() {
  const { user } = useSession();
  const state = useAsync(user ? () => supportApi.getTickets(user.id) : null, [user]);
  const { reload } = state;
  const waiting = state.data?.some((ticket) => ticket.status === 'OPEN') ?? false;

  useFocusEffect(useCallback(() => reload(), [reload]));
  useEffect(() => {
    if (!waiting) return;
    const interval = setInterval(reload, POLL_MS);
    return () => clearInterval(interval);
  }, [waiting, reload]);

  return { tickets: state.data ?? [], loading: state.loading, error: state.error, reload };
}
