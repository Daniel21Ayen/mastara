// apps/mobile/src/modules/support/api/support.api.ts
import type { CreateTicketInput, Ticket } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import { addTicket, listTickets } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface SupportApi {
  /** Newest first. */
  getTickets(userId: string): Promise<Ticket[]>;
  createTicket(userId: string, input: CreateTicketInput): Promise<Ticket>;
}

const mockSupportApi: SupportApi = {
  async getTickets(userId) {
    await simulateLatency(100);
    return listTickets(userId);
  },
  async createTicket(userId, input) {
    await simulateLatency(250);
    return addTicket(userId, input);
  },
};

function createSupportApi(): SupportApi {
  if (env.useMocks) return mockSupportApi;
  throw new Error('The real support API is added in the backend integration phase.');
}

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const supportApi = cacheReads('support', createSupportApi(), ['getTickets']);
