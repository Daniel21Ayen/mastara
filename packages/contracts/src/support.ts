// packages/contracts/src/support.ts
import { SUPPORT_MESSAGE_MAX, TICKET_STATUSES } from '@mastara/domain';
import { z } from 'zod';

import { VALIDATION } from './validation';

export const ticketMessageSchema = z.object({
  id: z.string(),
  from: z.enum(['STUDENT', 'ADMIN']),
  text: z.string(),
  createdAt: z.string(),
});

export const ticketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  status: z.enum(TICKET_STATUSES),
  createdAt: z.string(),
  messages: z.array(ticketMessageSchema),
});

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3, { message: VALIDATION.subject }),
  message: z.string().trim().min(5, { message: VALIDATION.message }).max(SUPPORT_MESSAGE_MAX, { message: VALIDATION.message }),
});

export type TicketMessage = z.infer<typeof ticketMessageSchema>;
export type Ticket = z.infer<typeof ticketSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
