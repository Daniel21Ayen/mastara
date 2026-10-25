// apps/mobile/src/modules/phase9.staging-sync.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CatalogItemHeader, CatalogSnapshotResponse } from '@mastara/contracts';

import {
  getLocalCatalogCourses,
  getLocalCatalogModules,
  getLocalCatalogState,
  getLocalCatalogTopics,
  parseCatalogTitle,
  syncCatalog,
} from '../core/sync/catalogSync';
import { httpClient } from '../core/network/httpClient';
import { setForcedOffline } from '../core/network/connectivity';

describe('Phase 9: Staging E2E - Admin to Mobile Flow (Publish -> Sync -> Student View)', () => {
  const studentUserId = 'student-staging-test-1';
  const originalGet = httpClient.get;

  it('admin publishes new module & topic -> mobile syncs snapshot delta -> student sees update locally', async () => {
    // -----------------------------------------------------------------------
    // Step 1: Initial catalog state on student phone (Version 1)
    // -----------------------------------------------------------------------
    const initialItems: CatalogItemHeader[] = [
      {
        id: 'course-cs-101',
        kind: 'COURSE',
        courseId: 'course-cs-101',
        title: { en: 'Computer Science 101', am: 'የኮምፒውተር ሳይንስ 101' },
        order: 1,
        isFree: false,
        updatedAt: 1700000000000,
        meta: { stream: 'NATURAL' },
      },
    ];

    const v1Response: CatalogSnapshotResponse = {
      version: 'v-staging-101',
      items: initialItems,
      deletedIds: [],
      page: 1,
      limit: 500,
      total: 1,
      hasMore: false,
    };

    httpClient.get = async <T>(_url: string): Promise<T> => {
      return v1Response as unknown as T;
    };

    setForcedOffline(false);
    const initialSync = await syncCatalog(studentUserId, true);
    assert.strictEqual(initialSync.updated, true);

    const initialCourses = await getLocalCatalogCourses(studentUserId);
    assert.strictEqual(initialCourses.length, 1);
    assert.strictEqual(initialCourses[0].id, 'course-cs-101');

    // Currently no topics published under this course
    const initialTopics = await getLocalCatalogTopics('course-cs-101', undefined, studentUserId);
    assert.strictEqual(initialTopics.length, 0);

    // -----------------------------------------------------------------------
    // Step 2: Admin publishes a new Module and a new Topic on the Admin Web
    // -----------------------------------------------------------------------
    const publishedModuleId = 'mod-algorithms-1';
    const publishedTopicId = 'top-sorting-algorithms';

    const deltaSnapshot: CatalogSnapshotResponse = {
      version: 'v-staging-102',
      items: [
        {
          id: publishedModuleId,
          kind: 'MODULE',
          courseId: 'course-cs-101',
          parentId: null,
          title: 'Algorithms & Complexity',
          order: 1,
          isFree: true,
          updatedAt: 1700000060000,
        },
        {
          id: publishedTopicId,
          kind: 'TOPIC',
          courseId: 'course-cs-101',
          parentId: publishedModuleId,
          title: { en: 'QuickSort & MergeSort', am: 'ፈጣን ድልድል እና ቅልቅል ድልድል' },
          order: 1,
          isFree: false,
          updatedAt: 1700000060000,
          meta: {
            kind: 'MODULE',
            summary: {
              en: 'Divide-and-conquer sorting algorithms',
              am: 'የመከፋፈል እና የማሸነፍ ስልተ-ቀመሮች',
            },
          },
        },
      ],
      deletedIds: [],
      page: 1,
      limit: 500,
      total: 2,
      hasMore: false,
    };

    httpClient.get = async <T>(_url: string): Promise<T> => {
      return deltaSnapshot as unknown as T;
    };

    // -----------------------------------------------------------------------
    // Step 3: Mobile client performs catalog sync
    // -----------------------------------------------------------------------
    const syncResult = await syncCatalog(studentUserId, true);
    assert.strictEqual(syncResult.updated, true, 'Mobile sync must successfully apply published delta');

    const state = await getLocalCatalogState(studentUserId);
    assert.strictEqual(state.version, 'v-staging-102', 'Catalog version bumped to newly published version');

    // -----------------------------------------------------------------------
    // Step 4: Student queries local SQLite & sees newly published content
    // -----------------------------------------------------------------------
    // Student inspects modules
    const modules = await getLocalCatalogModules('course-cs-101', studentUserId);
    assert.strictEqual(modules.length, 1);
    assert.strictEqual(modules[0].id, publishedModuleId);
    assert.strictEqual(modules[0].title, 'Algorithms & Complexity');

    // Student inspects topics inside the published module
    const topics = await getLocalCatalogTopics('course-cs-101', publishedModuleId, studentUserId);
    assert.strictEqual(topics.length, 1);
    assert.strictEqual(topics[0].id, publishedTopicId);
    assert.strictEqual(parseCatalogTitle(topics[0].title, 'en'), 'QuickSort & MergeSort');
    assert.strictEqual(parseCatalogTitle(topics[0].title, 'am'), 'ፈጣን ድልድል እና ቅልቅል ድልድል');

    // -----------------------------------------------------------------------
    // Step 5: Verify that in airplane mode, the student still sees published items
    // -----------------------------------------------------------------------
    setForcedOffline(true);
    try {
      const offlineTopics = await getLocalCatalogTopics('course-cs-101', publishedModuleId, studentUserId);
      assert.strictEqual(offlineTopics.length, 1);
      assert.strictEqual(offlineTopics[0].id, publishedTopicId);
    } finally {
      setForcedOffline(false);
      httpClient.get = originalGet;
    }
  });
});
