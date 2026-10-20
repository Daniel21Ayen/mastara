// apps/mobile/src/core/db/cache.ts
import { ERROR_CODES, trustedNowMs } from '@mastara/domain';
import type { ClockReading } from '@mastara/domain';

import { isApiError } from '@/core/network';
import { getBootId, getUptimeMs } from '@/core/timer';

import { getDb } from './database';
import { dbUser } from './userScope';

interface CacheHit<T> {
  value: T;
  cachedAtMs: number;
  /** Both clocks when it was saved. Missing for answers saved before F9b. */
  clock?: ClockReading;
}

const cacheStore = {
  async put(key: string, value: unknown): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO api_cache (user_id, key, value, cached_at, cached_uptime, cached_boot) VALUES (?, ?, ?, ?, ?, ?)',
        [dbUser(), key, JSON.stringify(value), Date.now(), await getUptimeMs(), getBootId() ?? null],
      );
    } catch {
      // In non-native test environments or before DB init, gracefully ignore cache write
    }
  },

  async get<T>(key: string): Promise<CacheHit<T> | null> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{
        value: string;
        cached_at: number;
        cached_uptime: number | null;
        cached_boot: string | null;
      }>('SELECT value, cached_at, cached_uptime, cached_boot FROM api_cache WHERE user_id = ? AND key = ?', [
        dbUser(),
        key,
      ]);
      if (!row) return null;
      return {
        value: JSON.parse(row.value) as T,
        cachedAtMs: row.cached_at,
        clock:
          row.cached_uptime === null
            ? undefined
            : { wallMs: row.cached_at, uptimeMs: row.cached_uptime, bootId: row.cached_boot ?? undefined },
      };
    } catch {
      return null;
    }
  },
};


/**
 * Network first: a successful answer is saved on the phone. When the phone is offline the saved answer is used.
 * `adapt` can change a saved answer before use (for example to apply the offline access rules). It receives a trusted
 * "now" that a date set back on the phone cannot move earlier (see `trustedNowMs`).
 */
export async function readThrough<T>(
  key: string,
  load: () => Promise<T>,
  adapt?: (value: T, cachedAtMs: number, nowMs: number) => T,
): Promise<T> {
  try {
    const value = await load();
    await cacheStore.put(key, value);
    return value;
  } catch (error) {
    if (!isApiError(error, ERROR_CODES.NETWORK_OFFLINE)) throw error;

    const hit = await cacheStore.get<T>(key);
    if (!hit) throw error;
    if (!adapt) return hit.value;
    const now: ClockReading = { wallMs: Date.now(), uptimeMs: await getUptimeMs(), bootId: getBootId() };
    return adapt(hit.value, hit.cachedAtMs, trustedNowMs(hit.cachedAtMs, hit.clock, now));
  }
}

/** Wraps the named read methods of an API object with `readThrough`. Writes are left alone. */
export function cacheReads<A extends object, K extends keyof A>(prefix: string, api: A, methods: readonly K[]): A {
  const wrapped = { ...api };

  for (const method of methods) {
    const original = api[method] as unknown as (...args: unknown[]) => Promise<unknown>;
    wrapped[method] = ((...args: unknown[]) =>
      readThrough(`${prefix}.${String(method)}.${JSON.stringify(args)}`, () => original.apply(api, args))) as A[K];
  }
  return wrapped;
}
