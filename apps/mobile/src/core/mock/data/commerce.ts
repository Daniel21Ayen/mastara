// apps/mobile/src/core/mock/data/commerce.ts
import type { Order } from '@mastara/contracts';
import { DEFAULT_PRICING_CONFIG, normalizeReference } from '@mastara/domain';
import type { AccessState, PaymentMethod, PricingConfig } from '@mastara/domain';

import { mockAccessFor } from './progress';

/**
 * In-memory "server" state for orders and paid access, shared by every mock API so that an approved
 * order really unlocks courses everywhere. Replaced by the real backend in the integration phase.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The mock admin "approves" an order this long after it is submitted. */
export const APPROVAL_DELAY_MS = 10_000;

export const MOCK_PRICING: PricingConfig = DEFAULT_PRICING_CONFIG;

/** Placeholders: the real account numbers are entered by the Admin. */
export const ADMIN_ACCOUNTS: Record<PaymentMethod, string> = {
  CBE_MOBILE: '[ADMIN CBE ACCOUNT]',
  CBE_BIRR: '[ADMIN CBE BIRR NUMBER]',
  TELEBIRR: '[ADMIN TELEBIRR NUMBER]',
};

// ---- paid access ----

const expiryByCourse = new Map<string, number>();

/** Adds access. An active course is extended from its current expiry, an expired one starts now. */
export function grantEntitlements(courseIds: readonly string[], durationDays: number, now = Date.now()): void {
  for (const id of courseIds) {
    const current = expiryByCourse.get(id);
    const start = current !== undefined && current > now ? current : now;
    expiryByCourse.set(id, start + durationDays * DAY_MS);
  }
}

// ---- orders ----

const ordersByUser = new Map<string, Order[]>();
const usedReferences = new Set<string>();
let counter = 0;

export function isReferenceUsed(reference: string): boolean {
  return usedReferences.has(normalizeReference(reference));
}

export function addOrder(userId: string, order: Omit<Order, 'id' | 'createdAt' | 'status'>, now = Date.now()): Order {
  counter += 1;
  const created: Order = { ...order, id: `o-${now}-${counter}`, status: 'PENDING', createdAt: new Date(now).toISOString() };
  usedReferences.add(normalizeReference(order.reference));
  ordersByUser.set(userId, [created, ...(ordersByUser.get(userId) ?? [])]);
  return created;
}

/** Moves pending orders past the delay to approved (granting access) or rejected. References containing "REJ" are rejected. */
export function settleOrders(now = Date.now()): void {
  for (const [userId, orders] of ordersByUser) {
    ordersByUser.set(
      userId,
      orders.map((order): Order => {
        if (order.status !== 'PENDING' || now - Date.parse(order.createdAt) < APPROVAL_DELAY_MS) return order;
        if (normalizeReference(order.reference).includes('REJ')) {
          return { ...order, status: 'REJECTED', rejectReason: 'MISMATCH' };
        }
        grantEntitlements(order.courseIds, order.durationDays, now);
        return { ...order, status: 'APPROVED' };
      }),
    );
  }
}

export function listOrders(userId: string, now = Date.now()): Order[] {
  settleOrders(now);
  return [...(ordersByUser.get(userId) ?? [])];
}

export function pendingOrderCount(userId: string, now = Date.now()): number {
  return listOrders(userId, now).filter((order) => order.status === 'PENDING').length;
}

/** Access of a course: paid access from approved orders wins, otherwise the generated sample state. */
export function accessFor(courseId: string, now = Date.now()): { access: AccessState; daysLeft?: number } {
  settleOrders(now);
  const expiresAt = expiryByCourse.get(courseId);

  if (expiresAt !== undefined) {
    return expiresAt > now
      ? { access: 'PAID', daysLeft: Math.ceil((expiresAt - now) / DAY_MS) }
      : { access: 'LOCKED' };
  }
  return mockAccessFor(courseId);
}
