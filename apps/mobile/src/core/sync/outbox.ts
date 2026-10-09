// apps/mobile/src/core/sync/outbox.ts
import type { OutboxOp } from '@mastara/contracts';
import { isDue, uuidv7 } from '@mastara/domain';
import type { OutboxType } from '@mastara/domain';
import * as Crypto from 'expo-crypto';

import { getDb } from '@/core/db/database';
import { dbUser } from '@/core/db/userScope';

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
    const id = uuidv7(now, Crypto.getRandomBytes(10));
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
      'SELECT COUNT(*) AS n FROM outbox WHERE user_id = ? AND applied_at IS NULL',
      [dbUser()],
    );
    return row?.n ?? 0;
  },

  /** Oldest first, only those whose retry wait has passed. */
  async due(limit = 50, now = Date.now()): Promise<OutboxOp[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<OutboxRow>(
      'SELECT id, type, payload, created_at, attempts, last_attempt_at FROM outbox WHERE user_id = ? AND applied_at IS NULL ORDER BY id',
      [dbUser()],
    );
    return rows
      .filter((row) => isDue({ attempts: row.attempts, lastAttemptMs: row.last_attempt_at }, now))
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        type: row.type,
        payload: JSON.parse(row.payload) as Record<string, unknown>,
        createdAt: row.created_at,
      }));
  },

  async markApplied(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const id of ids) await db.runAsync('UPDATE outbox SET applied_at = ? WHERE id = ?', [Date.now(), id]);
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
