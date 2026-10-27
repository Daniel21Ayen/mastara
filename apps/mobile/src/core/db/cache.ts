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

/** An empty list is almost always "the server had nothing yet", not an answer worth keeping across restarts. */
const isEmptyList = (value: unknown): boolean => Array.isArray(value) && value.length === 0;

export const cacheStore = {
  async put(key: string, value: unknown): Promise<void> {
    if (isEmptyList(value)) return;
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

  async invalidate(prefix?: string): Promise<void> {
    try {
      const db = await getDb();
      if (!prefix) {
        await db.runAsync('DELETE FROM api_cache WHERE user_id = ?', [dbUser()]);
      } else {
        await db.runAsync('DELETE FROM api_cache WHERE user_id = ? AND key LIKE ?', [
          dbUser(),
          `%${prefix}%`,
        ]);
      }
    } catch {
      // In non-native test environments or before DB init, gracefully ignore
    }
  },
};

/**
 * Remove cached responses for a given prefix (e.g. 'my-courses', 'store', 'notifications') or all cache for current user.
 */
export async function invalidateCache(prefix?: string): Promise<void> {
  await cacheStore.invalidate(prefix);
}

/**
 * Fast Cache with Background Revalidation (Stale-While-Revalidate):
 * When cached data is available on the phone, returns it immediately so screens render in <5ms without blocking on the network.
 * In the background, asynchronously refreshes the data from the server and updates SQLite.
 * `adapt` can change a saved answer before use (for example to apply the offline access rules).
 */
export async function readThrough<T>(
  key: string,
  load: () => Promise<T>,
  adapt?: (value: T, cachedAtMs: number, nowMs: number) => T,
): Promise<T> {
  // 1. Fast Cache Path: return cached data immediately to prevent loading delays
  const hit = await cacheStore.get<T>(key);
  if (hit && !isEmptyList(hit.value)) {
    const now: ClockReading = { wallMs: Date.now(), uptimeMs: await getUptimeMs(), bootId: getBootId() };
    const cachedResult = adapt ? adapt(hit.value, hit.cachedAtMs, trustedNowMs(hit.cachedAtMs, hit.clock, now)) : hit.value;

    // Asynchronously refresh in the background without blocking the UI
    load()
      .then((fresh) => cacheStore.put(key, fresh))
      .catch(() => {
        // Silently keep cached data if network fails
      });

    return cachedResult;
  }

  // 2. Cache miss: fetch from network
  try {
    const value = await load();
    await cacheStore.put(key, value);
    return value;
  } catch (error) {
    if (!isApiError(error, ERROR_CODES.NETWORK_OFFLINE)) throw error;
    throw error;
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
