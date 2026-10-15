// packages/domain/src/sync/selectDue.ts
import { isDue } from './backoff';

export interface PendingOp {
  id: string;
  type: string;
  attempts: number;
  lastAttemptMs: number | null;
}

/**
 * Which queued changes to send now. `pending` must be oldest first.
 * Order is kept within each type: if an older change of a type is still waiting to retry, newer changes of the same
 * type wait behind it (so "save profile" A never arrives after "save profile" B). Other types are not held up.
 */
export function selectDueOps<T extends PendingOp>(pending: readonly T[], nowMs: number, limit = 50): T[] {
  const blocked = new Set<string>();
  const selected: T[] = [];

  for (const op of pending) {
    if (selected.length >= limit) break;
    if (blocked.has(op.type)) continue;
    if (!isDue({ attempts: op.attempts, lastAttemptMs: op.lastAttemptMs }, nowMs)) {
      blocked.add(op.type);
      continue;
    }
    selected.push(op);
  }
  return selected;
}
