// apps/mobile/src/core/mock/data/engagement.ts
import type { CreateTicketInput, Ticket } from '@mastara/contracts';

/** In-memory "server" state for notifications read-marks and support tickets. Replaced by the backend later. */

/** The mock admin answers a ticket this long after it is sent. */
export const SUPPORT_REPLY_DELAY_MS = 15_000;

const readIds = new Set<string>();

export const isNotificationRead = (id: string): boolean => readIds.has(id);
export const markNotificationsRead = (ids: readonly string[]): void => ids.forEach((id) => readIds.add(id));

const ticketsByUser = new Map<string, Ticket[]>();
let counter = 0;

export function addTicket(userId: string, input: CreateTicketInput, now = Date.now()): Ticket {
  counter += 1;
  const createdAt = new Date(now).toISOString();
  const ticket: Ticket = {
    id: `t-${now}-${counter}`,
    subject: input.subject.trim(),
    status: 'OPEN',
    createdAt,
    messages: [{ id: `m-${now}-1`, from: 'STUDENT', text: input.message.trim(), createdAt }],
  };
  ticketsByUser.set(userId, [ticket, ...(ticketsByUser.get(userId) ?? [])]);
  return ticket;
}

/** Open tickets older than the delay get an admin reply and become Answered. */
export function listTickets(userId: string, now = Date.now()): Ticket[] {
  const settled = (ticketsByUser.get(userId) ?? []).map((ticket): Ticket => {
    if (ticket.status !== 'OPEN' || now - Date.parse(ticket.createdAt) < SUPPORT_REPLY_DELAY_MS) return ticket;
    return {
      ...ticket,
      status: 'ANSWERED',
      messages: [
        ...ticket.messages,
        {
          id: `${ticket.id}-reply`,
          from: 'ADMIN',
          text: 'Thank you for writing to us. We are looking into it and will update you here.',
          createdAt: new Date(Date.parse(ticket.createdAt) + SUPPORT_REPLY_DELAY_MS).toISOString(),
        },
      ],
    };
  });
  ticketsByUser.set(userId, settled);
  return [...settled];
}
