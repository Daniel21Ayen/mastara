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

export const replyTicketSchema = z.object({
  message: z.string().trim().min(2, { message: 'Message is required' }).max(SUPPORT_MESSAGE_MAX, { message: 'Message is too long' }),
});

export const adminTicketSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  studentIdentifier: z.string(),
  studentUniversity: z.string().optional(),
  studentProgram: z.string().optional(),
  category: z.string().default('GENERAL'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  subject: z.string(),
  status: z.enum(TICKET_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(ticketMessageSchema),
});

export const ticketFilterQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  q: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export const supportStatsSchema = z.object({
  total: z.number().int().min(0),
  open: z.number().int().min(0),
  answered: z.number().int().min(0),
  resolved: z.number().int().min(0),
});

export type TicketMessage = z.infer<typeof ticketMessageSchema>;
export type Ticket = z.infer<typeof ticketSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ReplyTicketInput = z.infer<typeof replyTicketSchema>;
export type AdminTicket = z.infer<typeof adminTicketSchema>;
export type TicketFilterInput = z.input<typeof ticketFilterQuerySchema>;
export type TicketFilterQuery = z.output<typeof ticketFilterQuerySchema>;
export type SupportStats = z.infer<typeof supportStatsSchema>;
