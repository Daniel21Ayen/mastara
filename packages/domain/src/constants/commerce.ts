// packages/domain/src/constants/commerce.ts
export const PRODUCT_TYPES = ['BUNDLE', 'SINGLE', 'FULL_STREAM', 'FULL_BOTH'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PAYMENT_METHODS = ['CBE_MOBILE', 'CBE_BIRR', 'TELEBIRR'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ORDER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const REJECT_REASONS = ['MISMATCH', 'UNREADABLE', 'DUPLICATE'] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

/** Streams an order can cover. BOTH is only valid for the both-streams package. */
export const ORDER_STREAMS = ['NATURAL', 'SOCIAL', 'BOTH'] as const;
export type OrderStream = (typeof ORDER_STREAMS)[number];

/** Days before expiry in which an owned course may be bought again (renewal). Admin-managed later. */
export const RENEWAL_WINDOW_DAYS = 7;
