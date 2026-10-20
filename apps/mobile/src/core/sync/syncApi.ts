// apps/mobile/src/core/sync/syncApi.ts
import type { OutboxOp, SyncResult } from '@mastara/contracts';

import { httpClient } from '@/core/network';

export interface SyncApi {
  /** Uploads queued changes. Safe to repeat: the server ignores an ID it has already applied. */
  pushBatch(userId: string, ops: readonly OutboxOp[]): Promise<SyncResult[]>;
}

export const syncApi: SyncApi = {
  async pushBatch(_userId: string, ops: readonly OutboxOp[]): Promise<SyncResult[]> {
    return httpClient.post<SyncResult[]>('/sync/outbox', { ops });
  },
};
