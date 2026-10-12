// apps/mobile/src/modules/support/api/support.api.ts
import type { CreateTicketInput, Ticket } from '@mastara/contracts';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface SupportApi {
  /** Newest first. */
  getTickets(userId: string): Promise<Ticket[]>;
  createTicket(userId: string, input: CreateTicketInput): Promise<Ticket>;
}

function mapTicket(t: any): Ticket {
  const status: 'OPEN' | 'ANSWERED' =
    t.status === 'RESOLVED' || t.status === 'IN_PROGRESS' || t.status === 'ANSWERED'
      ? 'ANSWERED'
      : 'OPEN';
  return {
    id: t.id,
    subject: t.subject,
    status,
    createdAt:
      typeof t.createdAt === 'string'
        ? t.createdAt
        : new Date(t.createdAt ?? Date.now()).toISOString(),
    messages: (t.messages ?? []).map((m: any) => ({
      id: m.id,
      from: m.from === 'ADMIN' ? 'ADMIN' : 'STUDENT',
      text: m.body ?? m.text ?? '',
      createdAt:
        typeof m.createdAt === 'string'
          ? m.createdAt
          : new Date(m.createdAt ?? Date.now()).toISOString(),
    })),
  };
}

const realSupportApi: SupportApi = {
  async getTickets(_userId) {
    const briefs = await httpClient.get<any[]>('/support/tickets');
    if (!briefs || briefs.length === 0) return [];
    const details = await Promise.all(
      briefs.map((b) => httpClient.get<any>(`/support/tickets/${b.id}`)),
    );
    return details.map(mapTicket);
  },
  async createTicket(_userId, input) {
    const res = await httpClient.post<any>('/support/tickets', input);
    return mapTicket(res);
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const supportApi = cacheReads('support', realSupportApi, ['getTickets']);
