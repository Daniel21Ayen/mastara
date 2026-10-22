// apps/mobile/src/core/sync/outbox.ts
import type { OutboxOp } from '@mastara/contracts';
import { selectDueOps } from '@mastara/domain';
import type { OutboxType } from '@mastara/domain';

import { getDb } from '@/core/db/database';
import { dbUser } from '@/core/db/userScope';

import { newId } from './ids';

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((listener) => listener());

interface OutboxRow {
  id: string;
  type: OutboxType;
  payload: string;
  created_at: string;
  attempts: number;
  last_attempt_at: number | null;
}

/** Changes made on the phone that the server has not confirmed yet. Survives the app being closed. */
export const outbox = {
  /** Saves a change locally (one small write) and returns at once. The sync worker uploads it later. */
  async enqueue(type: OutboxType, payload: Record<string, unknown>): Promise<string> {
    const now = Date.now();
    const id = newId();
    const db = await getDb();
    await db.runAsync(
      'INSERT INTO outbox (id, user_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, dbUser(), type, JSON.stringify(payload), new Date(now).toISOString()],
    );
    notify();
    return id;
  },

  async pendingCount(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM outbox WHERE user_id = ? AND applied_at IS NULL AND rejected_at IS NULL',
      [dbUser()],
    );
    return row?.n ?? 0;
  },

  /** Changes the server refused. They are not retried; they stay for a month so support can look at them. */
  async rejectedCount(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM outbox WHERE user_id = ? AND rejected_at IS NOT NULL',
      [dbUser()],
    );
    return row?.n ?? 0;
  },

  /** Checks if a specific exam sitting is currently waiting in the outbox to be synced. */
  async isSittingPending(sittingId: string): Promise<boolean> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM outbox WHERE user_id = ? AND type = ? AND payload LIKE ? AND applied_at IS NULL AND rejected_at IS NULL',
      [dbUser(), 'EXAM_SUBMITTED', `%"sittingId":"${sittingId}"%`],
    );
    return (row?.n ?? 0) > 0;
  },

  /** Oldest first, only those whose retry wait has passed. Order is kept within each type (see `selectDueOps`). */
  async due(limit = 50, now = Date.now()): Promise<OutboxOp[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<OutboxRow>(
      'SELECT id, type, payload, created_at, attempts, last_attempt_at FROM outbox WHERE user_id = ? AND applied_at IS NULL AND rejected_at IS NULL ORDER BY id',
      [dbUser()],
    );
    const pending = rows.map((row) => ({ ...row, lastAttemptMs: row.last_attempt_at }));

    const ops: OutboxOp[] = [];
    const unreadable: string[] = [];
    for (const row of selectDueOps(pending, now, limit)) {
      try {
        ops.push({
          id: row.id,
          type: row.type,
          payload: JSON.parse(row.payload) as Record<string, unknown>,
          createdAt: row.created_at,
        });
      } catch {
        unreadable.push(row.id); // a damaged row must not block every change behind it
      }
    }
    await this.markRejected(unreadable, 'unreadable payload');
    return ops;
  },

  async markApplied(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const id of ids) await db.runAsync('UPDATE outbox SET applied_at = ? WHERE id = ?', [Date.now(), id]);
    });
    notify();
  },

  /** The server refused these changes. Retrying cannot help, so they leave the queue and are kept for diagnosis. */
  async markRejected(ids: readonly string[], message: string): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const id of ids) {
        await db.runAsync('UPDATE outbox SET rejected_at = ?, last_error = ? WHERE id = ?', [Date.now(), message, id]);
      }
    });
    notify();
  },

  async markFailed(ids: readonly string[], message: string): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const id of ids) {
        await db.runAsync('UPDATE outbox SET attempts = attempts + 1, last_attempt_at = ?, last_error = ? WHERE id = ?', [
          Date.now(),
          message,
          id,
        ]);
      }
    });
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
