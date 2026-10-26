// packages/contracts/src/commerce.ts
import {
  isValidReference,
  ORDER_STATUSES,
  ORDER_STREAMS,
  PAYMENT_METHODS,
  PRODUCT_TYPES,
  REJECT_REASONS,
} from '@mastara/domain';
import type { PaymentMethod } from '@mastara/domain';
import { z } from 'zod';

import { VALIDATION } from './validation';

/** Reference check that depends on the chosen payment method (CBE references start with FT). */
export function referenceSchemaFor(method: PaymentMethod) {
  return z.string().refine((value) => isValidReference(method, value), { message: VALIDATION.reference });
}

export const orderSchema = z.object({
  id: z.string(),
  type: z.enum(PRODUCT_TYPES),
  stream: z.enum(ORDER_STREAMS),
  /** Courses the order covers. A full package lists every course it unlocks. */
  courseIds: z.array(z.string()),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string(),
  /** Price in ETB quoted by the server when the order was placed. */
  amount: z.number().int(),
  status: z.enum(ORDER_STATUSES),
  rejectReason: z.enum(REJECT_REASONS).optional(),
  /** ISO date-time. */
  createdAt: z.string(),
  durationDays: z.number().int(),
});

export const createOrderSchema = z.object({
  type: z.enum(PRODUCT_TYPES),
  stream: z.enum(ORDER_STREAMS),
  courseIds: z.array(z.string()),
  /** Program whose freshman courses a full package covers. */
  programId: z.string().optional(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string(),
});

export const refundStatusSchema = z.enum([
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'PAID_OUT',
  'ENTITLEMENT_REVOKED',
]);

export const adminRefundSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  amount: z.number(),
  reason: z.string(),
  status: refundStatusSchema,
  requestedBy: z.string(),
  reviewedBy: z.string().nullable().optional(),
  decisionReason: z.string().nullable().optional(),
  payoutReference: z.string().nullable().optional(),
  paidOutAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const refundListResultSchema = z.object({
  items: z.array(adminRefundSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type Order = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type RefundStatus = z.infer<typeof refundStatusSchema>;
export type AdminRefund = z.infer<typeof adminRefundSchema>;
export type RefundListResult = z.infer<typeof refundListResultSchema>;

