// packages/domain/src/constants/sync.ts
/** Kinds of change a phone can queue while offline. Add a kind here and handle it in the sync mock/server. */
export const OUTBOX_TYPES = ['PROFILE_SAVED', 'ATTEMPT_FINISHED', 'EXAM_SUBMITTED'] as const;
export type OutboxType = (typeof OUTBOX_TYPES)[number];

export const SYNC_RESULT_STATUSES = ['accepted', 'already_applied', 'rejected'] as const;
export type SyncResultStatus = (typeof SYNC_RESULT_STATUSES)[number];

/** How long paid access cached on the phone is trusted without reaching the server. Admin-managed later. */
export const OFFLINE_GRACE_DAYS = 7;

/** Housekeeping on the phone's database (see core/db/maintenance.ts). */
export const CACHE_MAX_AGE_DAYS = 30;
export const CACHE_MAX_ROWS = 500;
/** Confirmed changes are kept briefly (for support) and then removed; rejected ones are kept longer for diagnosis. */
export const APPLIED_OP_KEEP_DAYS = 7;
export const REJECTED_OP_KEEP_DAYS = 30;
