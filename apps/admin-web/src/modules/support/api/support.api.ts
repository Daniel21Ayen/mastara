// apps/admin-web/src/modules/support/api/support.api.ts
import type { AdminTicket, ReplyTicketInput, SupportStats, TicketFilterInput } from '@mastara/contracts';
import { adminTicketSchema, replyTicketSchema, supportStatsSchema } from '@mastara/contracts';
import type { TicketStatus } from '@mastara/domain';
import { httpClient } from '@/core/network';

export interface SupportApi {
  list(query?: TicketFilterInput): Promise<{ tickets: AdminTicket[]; total: number }>;
  get(id: string): Promise<AdminTicket>;
  reply(id: string, input: ReplyTicketInput): Promise<AdminTicket>;
  setStatus(id: string, status: TicketStatus): Promise<AdminTicket>;
  getStats(): Promise<SupportStats>;
}

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

export const supportApi: SupportApi = realSupportApi;
