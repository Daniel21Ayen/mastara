// packages/domain/src/constants/admin.ts

/** Only two roles exist. The server resolves the role from the stored account; the client never sends one. */
export const ROLES = ['STUDENT', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Who did something that is written to the audit log. */
export const AUDIT_ACTORS = ['ADMIN', 'STUDENT', 'SYSTEM'] as const;
export type AuditActor = (typeof AUDIT_ACTORS)[number];

/** Things the audit log records. Add a kind here, then a label in `packages/i18n/src/admin/en.json`. */
export const AUDIT_ACTIONS = [
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'DEVICE_REVOKED',
  'DEVICE_RELEASED_BY_STUDENT',
  'PRICE_CHANGED',
  'CONTENT_PUBLISHED',
  'EXAM_PUBLISHED',
  'ACCESS_GRANTED',
  'ACCESS_EXTENDED',
  'STUDENT_SUSPENDED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Days shown in the dashboard "new students" chart. */
export const DASHBOARD_TREND_DAYS = 7;

/** How many audit entries the dashboard "Recent activity" list shows. */
export const DASHBOARD_RECENT_LIMIT = 3;
