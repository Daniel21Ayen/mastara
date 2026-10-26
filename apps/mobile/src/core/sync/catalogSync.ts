// apps/mobile/src/core/sync/catalogSync.ts
import type {
  CatalogItemHeader,
  CatalogItemKind,
  CatalogSnapshotResponse,
} from '@mastara/contracts';
import { isDue, type RetryState } from '@mastara/domain';

import { getDb } from '@/core/db/database';
import { dbUser } from '@/core/db/userScope';
import { httpClient, isOnline } from '@/core/network';

import seedCatalog from '../../../assets/seedCatalog.json';

export interface LocalCatalogItem {
  user_id: string;
  id: string;
  kind: CatalogItemKind;
  course_id: string;
  parent_id: string | null;
  title: string;
  position: number;
  is_free: number;
  meta: string | null;
  updated_at: number;
}

export interface LocalCatalogState {
  version: string | null;
  synced_at: number | null;
}

let catalogRetryState: RetryState = {
  attempts: 0,
  lastAttemptMs: null,
};

let activeSyncPromise: Promise<{ updated: boolean; count: number }> | null = null;

/**
 * Parses raw stored title string (which may be JSON or plain text) into localized string.
 */
export function parseCatalogTitle(rawTitle: string, lang: 'en' | 'am' = 'en'): string {
  if (rawTitle && rawTitle.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawTitle);
      if (typeof parsed === 'object' && parsed !== null) {
        return lang === 'am' && parsed.am ? parsed.am : parsed.en || rawTitle;
      }
    } catch {
      // not JSON, fallback to raw string
    }
  }
  return rawTitle;
}

/**
 * Parses JSON metadata column if present.
 */
export function parseCatalogMeta<T = Record<string, any>>(metaStr: string | null): T | null {
  if (!metaStr) return null;
  try {
    return JSON.parse(metaStr) as T;
  } catch {
    return null;
  }
}

/**
 * Synchronizes catalog snapshot from server into local SQLite database.
 * Executes all delta mutations and version bookmark in a single withTransactionAsync.
 */
export async function syncCatalog(
  userId?: string,
  force = false,
): Promise<{ updated: boolean; count: number }> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    const effectiveUserId = userId || dbUser() || 'anonymous';
    if (!isOnline()) {
      return { updated: false, count: 0 };
    }

    if (!force && !isDue(catalogRetryState, Date.now())) {
      return { updated: false, count: 0 };
    }

    try {
      const db = await getDb();

      // 1. Read existing local catalog state
      const stateRow = await db.getFirstAsync<LocalCatalogState>(
        'SELECT version, synced_at FROM catalog_state WHERE user_id = ?',
        [effectiveUserId],
      );

      const storedVersion = stateRow?.version ?? null;
      let currentPage = 1;
      let hasMore = true;
      let latestVersion = storedVersion;
      const allItems: CatalogItemHeader[] = [];
      const allDeletedIds: string[] = [];

      while (hasMore) {
        const queryParams = new URLSearchParams();
        if (storedVersion) {
          queryParams.set('since', storedVersion);
        }
        queryParams.set('page', String(currentPage));
        queryParams.set('limit', '500');

        const headers: Record<string, string> = {};
        if (storedVersion) {
          headers['If-None-Match'] = `"${storedVersion}"`;
        }

        const snapshot = await httpClient.get<CatalogSnapshotResponse | null>(
          `/catalog/snapshot?${queryParams.toString()}`,
          { headers, timeoutMs: 15000 },
        );

        // 304 Not Modified
        if (!snapshot) {
          await db.runAsync(
            `INSERT INTO catalog_state (user_id, version, synced_at)
             VALUES (?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET synced_at = excluded.synced_at`,
            [effectiveUserId, storedVersion, Date.now()],
          );
          catalogRetryState = { attempts: 0, lastAttemptMs: Date.now() };
          return { updated: false, count: 0 };
        }

        latestVersion = snapshot.version;
        if (Array.isArray(snapshot.items)) {
          allItems.push(...snapshot.items);
        }
        if (Array.isArray(snapshot.deletedIds)) {
          allDeletedIds.push(...snapshot.deletedIds);
        }

        hasMore = Boolean(snapshot.hasMore);
        currentPage += 1;

        // Safety bound: avoid runaway pagination
        if (currentPage > 50) {
          break;
        }
      }

      // 2. Apply all changes atomically inside one transaction
      await db.withTransactionAsync(async () => {
        // Apply tombstones / deletions
        for (const deletedId of allDeletedIds) {
          await db.runAsync(
            'DELETE FROM catalog_item WHERE user_id = ? AND id = ?',
            [effectiveUserId, deletedId],
          );
        }

        // Apply upserts
        for (const item of allItems) {
          const titleStr =
            typeof item.title === 'string'
              ? item.title
              : JSON.stringify(item.title);
          const metaStr = item.meta ? JSON.stringify(item.meta) : null;
          const updatedAtNum =
            typeof item.updatedAt === 'number'
              ? item.updatedAt
              : new Date(item.updatedAt).getTime();

          await db.runAsync(
            `INSERT INTO catalog_item (
              user_id, id, kind, course_id, parent_id, title, position, is_free, meta, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, id) DO UPDATE SET
              kind = excluded.kind,
              course_id = excluded.course_id,
              parent_id = excluded.parent_id,
              title = excluded.title,
              position = excluded.position,
              is_free = excluded.is_free,
              meta = excluded.meta,
              updated_at = excluded.updated_at`,
            [
              effectiveUserId,
              item.id,
              item.kind,
              item.courseId,
              item.parentId ?? null,
              titleStr,
              item.order ?? 0,
              item.isFree ? 1 : 0,
              metaStr,
              updatedAtNum,
            ],
          );
        }

        // Save new version checkpoint
        await db.runAsync(
          `INSERT INTO catalog_state (user_id, version, synced_at)
           VALUES (?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             version = excluded.version,
             synced_at = excluded.synced_at`,
          [effectiveUserId, latestVersion, Date.now()],
        );
      });

      catalogRetryState = { attempts: 0, lastAttemptMs: Date.now() };
      return { updated: true, count: allItems.length };
    } catch (err) {
      catalogRetryState = {
        attempts: catalogRetryState.attempts + 1,
        lastAttemptMs: Date.now(),
      };
      console.warn('[catalogSync] Failed to sync catalog:', err);
      return { updated: false, count: 0 };
    }
  })();

  try {
    return await activeSyncPromise;
  } finally {
    activeSyncPromise = null;
  }
}

// -----------------------------------------------------------------------------
// Offline / Local Catalog Query APIs
// -----------------------------------------------------------------------------

/**
 * Ensures the bundled seed catalog is populated into SQLite on fresh launch
 * when the app has never connected to the network (SRS 6.4).
 */
export async function ensureCatalogSeeded(userId?: string): Promise<void> {
  const effectiveUserId = userId || dbUser() || 'anonymous';
  try {
    const db = await getDb();
    const countRow = await db.getFirstAsync<{ cnt: number }>(
      'SELECT count(*) AS cnt FROM catalog_item WHERE user_id = ?',
      [effectiveUserId],
    );
    if ((countRow?.cnt ?? 0) === 0 && seedCatalog?.items && Array.isArray(seedCatalog.items)) {
      await db.withTransactionAsync(async () => {
        for (const item of seedCatalog.items) {
          const titleStr = typeof item.title === 'string' ? item.title : JSON.stringify(item.title);
          const metaStr = item.meta ? JSON.stringify(item.meta) : null;
          await db.runAsync(
            `INSERT OR REPLACE INTO catalog_item
              (user_id, id, kind, course_id, parent_id, title, position, is_free, meta, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              effectiveUserId,
              item.id,
              item.kind,
              item.courseId,
              item.parentId ?? null,
              titleStr,
              item.order ?? 0,
              item.isFree ? 1 : 0,
              metaStr,
              Date.now(),
            ],
          );
        }
        await db.runAsync(
          `INSERT INTO catalog_state (user_id, version, synced_at)
           VALUES (?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             version = excluded.version,
             synced_at = excluded.synced_at`,
          [effectiveUserId, seedCatalog.version || 'v-seed-baseline-3.2', Date.now()],
        );
      });
    }
  } catch (err) {
    console.warn('[catalogSync] Failed to seed catalog:', err);
  }
}

export async function getLocalCatalogCourses(userId?: string): Promise<LocalCatalogItem[]> {
  try {
    const db = await getDb();
    const uid = userId || dbUser() || 'anonymous';
    await ensureCatalogSeeded(uid);
    return await db.getAllAsync<LocalCatalogItem>(
      `SELECT * FROM catalog_item
        WHERE user_id = ? AND kind = 'COURSE'
        ORDER BY position ASC, title ASC`,
      [uid],
    );
  } catch {
    return [];
  }
}

export async function getLocalCatalogModules(
  courseId: string,
  userId?: string,
): Promise<LocalCatalogItem[]> {
  try {
    const db = await getDb();
    const uid = userId || dbUser() || 'anonymous';
    await ensureCatalogSeeded(uid);
    return await db.getAllAsync<LocalCatalogItem>(
      `SELECT * FROM catalog_item
        WHERE user_id = ? AND course_id = ? AND kind = 'MODULE'
        ORDER BY position ASC`,
      [uid, courseId],
    );
  } catch {
    return [];
  }
}

export async function getLocalCatalogTopics(
  courseId: string,
  moduleId?: string,
  userId?: string,
): Promise<LocalCatalogItem[]> {
  try {
    const db = await getDb();
    const uid = userId || dbUser() || 'anonymous';
    await ensureCatalogSeeded(uid);
    if (moduleId) {
      return await db.getAllAsync<LocalCatalogItem>(
        `SELECT * FROM catalog_item
          WHERE user_id = ? AND course_id = ? AND kind = 'TOPIC' AND parent_id = ?
          ORDER BY position ASC`,
        [uid, courseId, moduleId],
      );
    }
    return await db.getAllAsync<LocalCatalogItem>(
      `SELECT * FROM catalog_item
        WHERE user_id = ? AND course_id = ? AND kind = 'TOPIC'
        ORDER BY position ASC`,
      [uid, courseId],
    );
  } catch {
    return [];
  }
}

export async function getLocalCatalogQuizChapters(
  courseId: string,
  userId?: string,
): Promise<LocalCatalogItem[]> {
  try {
    const db = await getDb();
    const uid = userId || dbUser() || 'anonymous';
    await ensureCatalogSeeded(uid);
    return await db.getAllAsync<LocalCatalogItem>(
      `SELECT * FROM catalog_item
        WHERE user_id = ? AND course_id = ? AND kind = 'QUIZ_CHAPTER'
        ORDER BY position ASC`,
      [uid, courseId],
    );
  } catch {
    return [];
  }
}

export async function getLocalCatalogExams(
  courseId: string,
  userId?: string,
): Promise<LocalCatalogItem[]> {
  try {
    const db = await getDb();
    const uid = userId || dbUser() || 'anonymous';
    await ensureCatalogSeeded(uid);
    return await db.getAllAsync<LocalCatalogItem>(
      `SELECT * FROM catalog_item
        WHERE user_id = ? AND course_id = ? AND kind = 'EXAM'
        ORDER BY position ASC`,
      [uid, courseId],
    );
  } catch {
    return [];
  }
}

export async function getLocalCatalogCocSets(userId?: string): Promise<LocalCatalogItem[]> {
  try {
    const db = await getDb();
    const uid = userId || dbUser() || 'anonymous';
    await ensureCatalogSeeded(uid);
    return await db.getAllAsync<LocalCatalogItem>(
      `SELECT * FROM catalog_item
        WHERE user_id = ? AND kind = 'COC_SET'
        ORDER BY position ASC`,
      [uid],
    );
  } catch {
    return [];
  }
}

export async function getLocalCatalogState(userId?: string): Promise<LocalCatalogState> {
  try {
    const db = await getDb();
    const uid = userId || dbUser() || 'anonymous';
    const row = await db.getFirstAsync<LocalCatalogState>(
      'SELECT version, synced_at FROM catalog_state WHERE user_id = ?',
      [uid],
    );
    return row ?? { version: null, synced_at: null };
  } catch {
    return { version: null, synced_at: null };
  }
}
