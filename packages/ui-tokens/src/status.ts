// packages/ui-tokens/src/status.ts
/**
 * Shared status-to-tone mapping.
 * Admin badges (web) and mobile chips both import this so the mapping is never duplicated.
 *
 * "Tone" names are intentionally generic so each platform can map them to its own visual tokens:
 *   primary → blue (published, active, paid, bound)
 *   success → green (approved, completed)
 *   warning → amber (pending, trial)
 *   danger  → red (danger, suspended, expired, rejected)
 *   neutral → grey (draft, unknown)
 */
export type StatusTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

/** Map a CatalogStatus string to a tone. */
export function catalogStatusTone(status: string): StatusTone {
  switch (status) {
    case 'PUBLISHED':
      return 'primary';
    case 'IN_REVIEW':
      return 'warning';
    case 'ARCHIVED':
      return 'neutral';
    default: // DRAFT
      return 'neutral';
  }
}

/** Map a StudentStatus string to a tone. */
export function studentStatusTone(status: string): StatusTone {
  switch (status) {
    case 'ACTIVE':
      return 'primary';
    case 'SUSPENDED':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Map a StudentAccessState string to a tone. */
export function accessStateTone(status: string): StatusTone {
  switch (status) {
    case 'PAID':
      return 'primary';
    case 'FREE_TRIAL':
      return 'warning';
    case 'EXPIRED':
      return 'danger';
    default: // PENDING
      return 'neutral';
  }
}

/** Map a DeviceStatus string to a tone. */
export function deviceStatusTone(status: string): StatusTone {
  switch (status) {
    case 'BOUND':
      return 'primary';
    default: // RELEASED
      return 'neutral';
  }
}

/** Map a payment/order status string to a tone. */
export function paymentStatusTone(status: string): StatusTone {
  switch (status) {
    case 'APPROVED':
    case 'COMPLETED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REJECTED':
    case 'FAILED':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Map a quiz/assessment kind string to a tone (QUIZ, FINAL, SECTION_CHECK). */
export function assessmentKindTone(kind: string): StatusTone {
  switch (kind) {
    case 'QUIZ':
      return 'primary';
    case 'FINAL':
      return 'danger';
    default: // SECTION_CHECK, COC, etc.
      return 'success';
  }
}

/**
 * Universal status-to-tone function used by admin badges and mobile chips.
 * Normalizes any entity status string to a canonical StatusTone.
 */
export function statusToTone(status: string | null | undefined): StatusTone {
  if (!status) return 'neutral';
  const s = status.trim().toUpperCase();
  switch (s) {
    case 'PUBLISHED':
    case 'ACTIVE':
    case 'PAID':
    case 'BOUND':
    case 'QUIZ':
    case 'VERIFIED':
      return 'primary';
    case 'APPROVED':
    case 'COMPLETED':
    case 'SUCCESS':
    case 'SECTION_CHECK':
      return 'success';
    case 'PENDING':
    case 'IN_REVIEW':
    case 'FREE_TRIAL':
    case 'TRIAL':
    case 'WARNING':
      return 'warning';
    case 'SUSPENDED':
    case 'EXPIRED':
    case 'REJECTED':
    case 'FAILED':
    case 'FINAL':
    case 'DANGER':
    case 'CANCELLED':
      return 'danger';
    case 'DRAFT':
    case 'ARCHIVED':
    case 'RELEASED':
    case 'UNPAID':
    case 'MUTED':
    case 'NEUTRAL':
    default:
      return 'neutral';
  }
}
