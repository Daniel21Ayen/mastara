// apps/mobile/src/core/sync/syncWorker.ts
import { isOnline } from '@/core/network';

import { outbox } from './outbox';
import { syncApi } from './syncApi';

export interface FlushResult {
  sent: number;
  failed: number;
}

let running: Promise<FlushResult> | null = null;

async function run(userId: string): Promise<FlushResult> {
  if (!isOnline()) return { sent: 0, failed: 0 };

  const ops = await outbox.due();
  if (ops.length === 0) return { sent: 0, failed: 0 };

  try {
    const results = await syncApi.pushBatch(userId, ops);
    const done = results.filter((result) => result.status !== 'rejected').map((result) => result.id);
    const rejected = results.filter((result) => result.status === 'rejected').map((result) => result.id);

    await outbox.markApplied(done);
    await outbox.markFailed(rejected, 'rejected by server');
    return { sent: done.length, failed: rejected.length };
  } catch (error) {
    // Network or server problem: keep everything and retry later with a growing wait.
    await outbox.markFailed(ops.map((op) => op.id), error instanceof Error ? error.message : 'sync failed');
    return { sent: 0, failed: ops.length };
  }
}

/** Uploads due changes. Calls made while one upload is running share its result (no double upload). */
export function flushOutbox(userId: string): Promise<FlushResult> {
  running ??= run(userId).finally(() => {
    running = null;
  });
  return running;
}
