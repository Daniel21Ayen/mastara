// apps/mobile/src/core/sync/syncApi.ts
import type { OutboxOp, SyncResult } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { applyOps } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface SyncApi {
  /** Uploads queued changes. Safe to repeat: the server ignores an ID it has already applied. */
  pushBatch(userId: string, ops: readonly OutboxOp[]): Promise<SyncResult[]>;
}

const mockSyncApi: SyncApi = {
  async pushBatch(userId, ops) {
    await simulateLatency(200);
    return applyOps(userId, ops);
  },
};

function createSyncApi(): SyncApi {
  if (env.useMocks) return mockSyncApi;
  throw new Error('The real sync API is added in the backend integration phase.');
}

export const syncApi = createSyncApi();
