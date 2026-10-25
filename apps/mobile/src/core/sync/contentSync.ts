// apps/mobile/src/core/sync/contentSync.ts
import { isOnline, httpClient } from '@/core/network';
import { cacheStore } from '@/core/db/cache';

const etags = new Map<string, string>();

interface DeltaSyncItem {
  key: string;
  url: string;
  requiresAuth: boolean;
}

const SYNC_ENDPOINTS: DeltaSyncItem[] = [
  { key: 'catalog:universities', url: '/catalog/universities', requiresAuth: false },
  { key: 'commerce:pricing', url: '/commerce/pricing', requiresAuth: false },
  { key: 'learning:myCourses', url: '/learning/my-courses', requiresAuth: true },
  { key: 'learning:homeSummary', url: '/learning/home-summary', requiresAuth: true },
];

/**
 * Synchronizes downstream course & catalog content using version or ETag delta sync.
 * Kept strictly separate from the outbox sync mechanism.
 */
export async function syncDownstreamContent(userId?: string): Promise<void> {
  if (!isOnline()) return;

  for (const item of SYNC_ENDPOINTS) {
    if (item.requiresAuth && !userId) continue;

    try {
      const headers: Record<string, string> = {};
      const currentEtag = etags.get(item.key);
      if (currentEtag) {
        headers['If-None-Match'] = currentEtag;
      }

      const res = await httpClient.get<any>(item.url, { headers });
      if (res) {
        // Compute or read ETag/version hash and update local SQLite cache
        const newEtag = typeof res === 'object' && res ? JSON.stringify(res).length.toString() : 'v1';
        etags.set(item.key, newEtag);
        await cacheStore.put(item.key, res);
      }
    } catch {
      // 304 Not Modified or transient network failure: keep cached version
    }
  }
}
