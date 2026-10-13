// apps/mobile/src/core/db/maintenance.ts
import { APPLIED_OP_KEEP_DAYS, CACHE_MAX_AGE_DAYS, CACHE_MAX_ROWS, REJECTED_OP_KEEP_DAYS } from '@mastara/domain';

import { getDb } from './database';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The clean-up statements. Kept as plain SQL so they can be checked against a real SQLite. */
export const MAINTENANCE_SQL = {
  oldCache: 'DELETE FROM api_cache WHERE cached_at < ?',
  // Keep the newest N saved answers per student, drop the rest.
  excessCache:
    'DELETE FROM api_cache WHERE (user_id, key) NOT IN (SELECT c.user_id, c.key FROM api_cache c WHERE c.user_id = api_cache.user_id ORDER BY c.cached_at DESC LIMIT ?)',
  appliedOps: 'DELETE FROM outbox WHERE applied_at IS NOT NULL AND applied_at < ?',
  rejectedOps: 'DELETE FROM outbox WHERE rejected_at IS NOT NULL AND rejected_at < ?',
} as const;

/**
 * Keeps the phone's database small: removes old saved server answers, caps how many are kept, and removes changes
 * that were confirmed (a week ago) or rejected (a month ago). Never touches changes still waiting, answers in progress
 * or results. Safe to run on every start.
 */
export async function runDatabaseMaintenance(nowMs: number = Date.now()): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(MAINTENANCE_SQL.oldCache, [nowMs - CACHE_MAX_AGE_DAYS * DAY_MS]);
    await db.runAsync(MAINTENANCE_SQL.excessCache, [CACHE_MAX_ROWS]);
    await db.runAsync(MAINTENANCE_SQL.appliedOps, [nowMs - APPLIED_OP_KEEP_DAYS * DAY_MS]);
    await db.runAsync(MAINTENANCE_SQL.rejectedOps, [nowMs - REJECTED_OP_KEEP_DAYS * DAY_MS]);
  });
}
