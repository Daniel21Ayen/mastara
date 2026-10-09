// apps/mobile/src/core/db/cache.ts
import { ERROR_CODES } from '@mastara/domain';

import { isApiError } from '@/core/network';

import { getDb } from './database';
import { dbUser } from './userScope';

interface CacheHit<T> {
  value: T;
  cachedAtMs: number;
}

const cacheStore = {
  async put(key: string, value: unknown): Promise<void> {
    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO api_cache (user_id, key, value, cached_at) VALUES (?, ?, ?, ?)', [
      dbUser(),
      key,
      JSON.stringify(value),
      Date.now(),
    ]);
  },

  async get<T>(key: string): Promise<CacheHit<T> | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string; cached_at: number }>(
      'SELECT value, cached_at FROM api_cache WHERE user_id = ? AND key = ?',
      [dbUser(), key],
    );
    return row ? { value: JSON.parse(row.value) as T, cachedAtMs: row.cached_at } : null;
  },
};

/**
 * Network first: a successful answer is saved on the phone. When the phone is offline the saved answer is used.
 * `adapt` can change a saved answer before use (for example to apply the offline access rules).
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
    return adapt ? adapt(hit.value, hit.cachedAtMs, Date.now()) : hit.value;
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
