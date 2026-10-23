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
import { httpClient } from '@/core/network';

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

export const realSupportApi: SupportApi = {
  async list(query) {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.category && query.category !== 'ALL') params.set('category', query.category);
    if (query?.priority) params.set('priority', query.priority);
    if (query?.q && query.q.trim()) params.set('q', query.q.trim());
    if (query?.page) params.set('page', String(query.page));
    if (query?.pageSize) params.set('pageSize', String(query.pageSize));

    const qs = params.toString();
    const url = `/support/admin/tickets${qs ? `?${qs}` : ''}`;
    const result = await httpClient.get<{ tickets: AdminTicket[]; total: number }>(url);
    return {
      tickets: result.tickets.map((t) => adminTicketSchema.parse(t)),
      total: result.total,
    };
  },

  async get(id) {
    const raw = await httpClient.get<AdminTicket>(`/support/admin/tickets/${encodeURIComponent(id)}`);
    return adminTicketSchema.parse(raw);
  },

  async reply(id, input) {
    const parsed = replyTicketSchema.parse(input);
    const raw = await httpClient.post<AdminTicket>(
      `/support/admin/tickets/${encodeURIComponent(id)}/reply`,
      parsed,
    );
    return adminTicketSchema.parse(raw);
  },

  async setStatus(id, status) {
    const raw = await httpClient.patch<AdminTicket>(
      `/support/admin/tickets/${encodeURIComponent(id)}/status`,
      { status },
    );
    return adminTicketSchema.parse(raw);
  },

  async getStats() {
    const raw = await httpClient.get<SupportStats>('/support/admin/tickets/stats');
    return supportStatsSchema.parse(raw);
  },
};

function createSupportApi(): SupportApi {
  if (env.useMocks) return mockSupportApi;
  return realSupportApi;
}

export const supportApi = createSupportApi();
