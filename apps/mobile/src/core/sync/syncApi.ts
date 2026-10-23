// apps/mobile/src/core/sync/syncApi.ts
import type { OutboxOp, SyncResult } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient } from '@/core/network';

export interface SyncApi {
  /** Uploads queued changes. Safe to repeat: the server ignores an ID it has already applied. */
  pushBatch(userId: string, ops: readonly OutboxOp[]): Promise<SyncResult[]>;
}

const mockAppliedOps = new Set<string>();

export const mockSyncApi: SyncApi = {
  async pushBatch(_userId: string, ops: readonly OutboxOp[]): Promise<SyncResult[]> {
    await simulateLatency();
    return ops.map((op) => {
      if (mockAppliedOps.has(op.id)) {
        return { id: op.id, status: 'already_applied' };
      }
      mockAppliedOps.add(op.id);
      return { id: op.id, status: 'accepted' };
    });
  },
};

export const realSyncApi: SyncApi = {
  async pushBatch(_userId: string, ops: readonly OutboxOp[]): Promise<SyncResult[]> {
    return httpClient.post<SyncResult[]>('/sync/outbox', { ops });
  },
};

export const syncApi: SyncApi = {
  pushBatch: (userId, ops) =>
    env.useMocks ? mockSyncApi.pushBatch(userId, ops) : realSyncApi.pushBatch(userId, ops),
};

