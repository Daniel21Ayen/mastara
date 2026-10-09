// packages/domain/src/constants/sync.ts
/** Kinds of change a phone can queue while offline. Add a kind here and handle it in the sync mock/server. */
export const OUTBOX_TYPES = ['PROFILE_SAVED', 'ATTEMPT_FINISHED', 'EXAM_SUBMITTED'] as const;
export type OutboxType = (typeof OUTBOX_TYPES)[number];

export const SYNC_RESULT_STATUSES = ['accepted', 'already_applied', 'rejected'] as const;
export type SyncResultStatus = (typeof SYNC_RESULT_STATUSES)[number];

/** How long paid access cached on the phone is trusted without reaching the server. Admin-managed later. */
export const OFFLINE_GRACE_DAYS = 7;
