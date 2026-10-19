// apps/admin-web/src/modules/support/api/support.api.ts
import type { AdminTicket, ReplyTicketInput, SupportStats, TicketFilterInput } from '@mastara/contracts';
import { adminTicketSchema, replyTicketSchema, supportStatsSchema } from '@mastara/contracts';
import type { TicketStatus } from '@mastara/domain';

import { env } from '@/core/config/env';
import {
  getSupportStats,
  getSupportTicket,
  listSupportTickets,
  replySupportTicket,
  setSupportTicketStatus,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface SupportApi {
  list(query?: TicketFilterInput): Promise<{ tickets: AdminTicket[]; total: number }>;
  get(id: string): Promise<AdminTicket>;
  reply(id: string, input: ReplyTicketInput): Promise<AdminTicket>;
  setStatus(id: string, status: TicketStatus): Promise<AdminTicket>;
  getStats(): Promise<SupportStats>;
}

const mockSupportApi: SupportApi = {
  async list(query) {
    await simulateLatency(120);
    const result = listSupportTickets(query);
    return {
      tickets: result.tickets.map((t) => adminTicketSchema.parse(t)),
      total: result.total,
    };
  },

  async get(id) {
    await simulateLatency(80);
    const ticket = getSupportTicket(id);
    if (!ticket) throw new Error(`Ticket ${id} not found`);
    return adminTicketSchema.parse(ticket);
  },

  async reply(id, input) {
    await simulateLatency(150);
    const parsed = replyTicketSchema.parse(input);
    const updated = replySupportTicket(id, parsed);
    return adminTicketSchema.parse(updated);
  },

  async setStatus(id, status) {
    await simulateLatency(100);
    const updated = setSupportTicketStatus(id, status);
    return adminTicketSchema.parse(updated);
  },

  async getStats() {
    await simulateLatency(50);
    return supportStatsSchema.parse(getSupportStats());
  },
};

function createSupportApi(): SupportApi {
  if (env.useMocks) return mockSupportApi;
  throw new Error('The real support API is added in the backend integration phase.');
}

export const supportApi = createSupportApi();
