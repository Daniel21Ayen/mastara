// packages/contracts/src/adminPayments.ts
import {
  ORDER_STATUSES,
  ORDER_STREAMS,
  PAYMENT_METHODS,
  PRODUCT_TYPES,
  REJECT_REASONS,
} from '@mastara/domain';
import { z } from 'zod';

/** Admin-only payment messages (i18n keys in `packages/i18n/src/admin/en.json`). */
export const PAYMENT_VALIDATION = {
  rejectReason: 'validation.rejectReason',
} as const;

const method = z.enum(PAYMENT_METHODS);

// ---- read shapes ----

export const adminPaymentSchema = z.object({
  /** Short readable ID such as PAY-1001. */
  id: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  universityShortName: z.string(),
  type: z.enum(PRODUCT_TYPES),
  stream: z.enum(ORDER_STREAMS),
  courses: z.array(z.object({ courseId: z.string(), code: z.string(), title: z.string() })),
  /** Price in ETB quoted when the order was placed. */
  amount: z.number().int(),
  method,
  reference: z.string(),
  status: z.enum(ORDER_STATUSES),
  rejectReason: z.enum(REJECT_REASONS).nullable(),
  /** ISO date-time. */
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
  /** Days of access the order gives, from the product setting when it was placed. */
  durationDays: z.number().int(),
  /** The earlier payment that used the same reference, or null when the reference is unique. */
  duplicateOf: z.string().nullable(),
});

export const paymentCountsSchema = z.object({
  pending: z.number().int().min(0),
  approved: z.number().int().min(0),
  rejected: z.number().int().min(0),
});

export const paymentListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES),
  method: method.optional(),
  /** Matches the student's name or ID, or the reference. */
  q: z.string().optional(),
  page: z.number().int().min(1).default(1),
});

export const paymentListResultSchema = z.object({
  items: z.array(adminPaymentSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageCount: z.number().int().min(1),
  /** Totals for the tab labels, unaffected by the filters. */
  counts: paymentCountsSchema,
});

// ---- write shapes ----

/** Rejecting needs a reason; approving does not. */
export const paymentDecisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('APPROVE') }),
  z.object({
    action: z.literal('REJECT'),
    reason: z.enum(REJECT_REASONS, { message: PAYMENT_VALIDATION.rejectReason }),
  }),
]);

export type AdminPayment = z.infer<typeof adminPaymentSchema>;
export type PaymentCounts = z.infer<typeof paymentCountsSchema>;
export type PaymentListQuery = z.input<typeof paymentListQuerySchema>;
export type PaymentListResult = z.infer<typeof paymentListResultSchema>;
export type PaymentDecision = z.infer<typeof paymentDecisionSchema>;
