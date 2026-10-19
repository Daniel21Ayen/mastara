// apps/admin-web/src/modules/support/hooks/useSupportTickets.ts
'use client';

import type { TicketFilterInput } from '@mastara/contracts';

import { useAsync } from '@/shared/hooks';

import { supportApi } from '../api/support.api';

export function useSupportTickets(query?: TicketFilterInput) {
  const status = query?.status;
  const category = query?.category;
  const priority = query?.priority;
  const q = query?.q;
  const page = query?.page;

  return useAsync(
    () => supportApi.list(query),
    [status, category, priority, q, page],
  );
}

export function useSupportTicket(id: string | null) {
  return useAsync(
    () => (id ? supportApi.get(id) : Promise.resolve(null)),
    [id],
  );
}

export function useSupportStats() {
  return useAsync(() => supportApi.getStats(), []);
}
