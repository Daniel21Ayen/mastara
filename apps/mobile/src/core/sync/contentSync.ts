// apps/mobile/src/core/sync/contentSync.ts
import { isOnline, httpClient } from '@/core/network';
import { env } from '@/core/config/env';

/**
 * Automatically synchronizes downstream course & content data whenever network connection is detected.
 */
export async function syncDownstreamContent(userId?: string): Promise<void> {
  if (env.useMocks || !isOnline()) return;

  try {
    // 1. Sync catalog universities & pricing
    await Promise.allSettled([
      httpClient.get('/catalog/universities').catch(() => null),
      httpClient.get('/commerce/pricing').catch(() => null),
    ]);

    // 2. If student is logged in, sync enrolled courses and home summary
    if (userId) {
      await Promise.allSettled([
        httpClient.get('/learning/my-courses').catch(() => null),
        httpClient.get('/learning/home-summary').catch(() => null),
      ]);
    }
  } catch (err) {
    // Background sync errors are non-blocking
    console.warn('[Sync] Automatic content sync warning:', err);
  }
}
