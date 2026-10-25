import type { CreateTicketInput, Ticket } from '@mastara/contracts';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface SupportApi {
  /** Newest first. */
  getTickets(userId: string): Promise<Ticket[]>;
  createTicket(userId: string, input: CreateTicketInput): Promise<Ticket>;
}

function mapTicket(t: any): Ticket {
  return {
    id: t.id,
    subject: t.subject,
    status: t.status,
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date(t.createdAt).toISOString(),
    messages: Array.isArray(t.messages)
      ? t.messages.map((m: any) => ({
          id: m.id,
          from: m.from,
          text: m.body ?? m.text ?? '',
          createdAt: typeof m.createdAt === 'string' ? m.createdAt : new Date(m.createdAt).toISOString(),
        }))
      : [],
  };
}

export const realSupportApi: SupportApi = {
  async getTickets(_userId) {
    const briefs = await httpClient.get<Array<{ id: string }>>('/support/tickets');
    if (!briefs || briefs.length === 0) return [];
    const details = await Promise.all(
      briefs.map((b) => httpClient.get<any>(`/support/tickets/${b.id}`).catch(() => b)),
    );
    return details.map(mapTicket);
  },
  async createTicket(_userId, input) {
    const res = await httpClient.post<any>('/support/tickets', {
      subject: input.subject,
      message: input.message,
    });
    return mapTicket(res);
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const supportApi = cacheReads('support', realSupportApi, ['getTickets']);
