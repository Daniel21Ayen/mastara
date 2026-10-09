// packages/contracts/src/sync.ts
import { OUTBOX_TYPES, SYNC_RESULT_STATUSES } from '@mastara/domain';
import { z } from 'zod';

/** One change queued on the phone. `id` is a UUIDv7, so uploading it twice has no extra effect. */
export const outboxOpSchema = z.object({
  id: z.string(),
  type: z.enum(OUTBOX_TYPES),
  payload: z.record(z.unknown()),
  /** ISO date-time the change was made on the phone. */
  createdAt: z.string(),
});

export const syncResultSchema = z.object({
  id: z.string(),
  status: z.enum(SYNC_RESULT_STATUSES),
});

export type OutboxOp = z.infer<typeof outboxOpSchema>;
export type SyncResult = z.infer<typeof syncResultSchema>;
