// packages/domain/src/constants/engagement.ts
export const NOTIFICATION_KINDS = [
  'WELCOME',
  'PAYMENT_PENDING',
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'ACCESS_EXPIRING',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const TICKET_STATUSES = ['OPEN', 'ANSWERED', 'RESOLVED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CATEGORIES = ['PAYMENT', 'DEVICE', 'ACCESS', 'EXAMS', 'GENERAL'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const SUPPORT_MESSAGE_MAX = 1000;
