// apps/mobile/src/core/sync/catalogSync.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CatalogItemHeader, CatalogSnapshotResponse } from '@mastara/contracts';

import { getDb } from '@/core/db/database';
import { httpClient, setForcedOffline } from '@/core/network';

import {
  getLocalCatalogCocSets,
  getLocalCatalogCourses,
  getLocalCatalogExams,
  getLocalCatalogModules,
  getLocalCatalogQuizChapters,
  getLocalCatalogState,
  getLocalCatalogTopics,
  parseCatalogMeta,
  parseCatalogTitle,
  syncCatalog,
} from './catalogSync';

const testUserId = 'student-test-sync-1';

test('Phase 3: Migration v4 creates catalog_item and catalog_state with indices', async () => {
  const db = await getDb();

  // Verify tables exist
  const itemTable = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_item'",
  );
  assert.ok(itemTable, 'Table catalog_item should exist after migration v4');

  const stateTable = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_state'",
  );
  assert.ok(stateTable, 'Table catalog_state should exist after migration v4');

  // Verify composite index
  const indexInfo = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_catalog_list'",
  );
  assert.ok(indexInfo, 'Index idx_catalog_list should exist on catalog_item');
});

test('Phase 3: syncCatalog applies snapshot items and state in a single transaction', async () => {
  const mockItems: CatalogItemHeader[] = [
    {
      id: 'crs-1',
      kind: 'COURSE',
      courseId: 'crs-1',
      title: { en: 'Biology 101', am: 'ባዮሎጂ 101' },
      order: 1,
      isFree: false,
      updatedAt: Date.now(),
      meta: { stream: 'NATURAL' },
    },
    {
      id: 'mod-1',
      kind: 'MODULE',
      courseId: 'crs-1',
      parentId: null,
      title: 'Module 1: Cell Structure',
      order: 1,
      isFree: true,
      updatedAt: Date.now(),
    },
    {
      id: 'top-1',
      kind: 'TOPIC',
      courseId: 'crs-1',
      parentId: 'mod-1',
      title: { en: 'Plant Cells', am: 'የእፅዋት ሴሎች' },
      order: 1,
      isFree: true,
      updatedAt: Date.now(),
    },
    {
      id: 'qc-1',
      kind: 'QUIZ_CHAPTER',
      courseId: 'crs-1',
      parentId: 'top-1',
      title: 'Quiz 1: Cells',
      order: 1,
      isFree: true,
      updatedAt: Date.now(),
    },
    {
      id: 'ex-1',
      kind: 'EXAM',
      courseId: 'crs-1',
      title: 'Midterm 2024',
      order: 1,
      isFree: false,
      updatedAt: Date.now(),
      meta: { year: 2024, kind: 'MID' },
    },
    {
      id: 'coc-1',
      kind: 'COC_SET',
      courseId: 'coc-set-course',
      title: 'COC Accounting 2024',
      order: 1,
      isFree: false,
      updatedAt: Date.now(),
      meta: { year: 2024 },
    },
  ];

  const mockResponse: CatalogSnapshotResponse = {
    version: 'v-snapshot-100',
    items: mockItems,
    deletedIds: [],
    page: 1,
    limit: 500,
    total: mockItems.length,
    hasMore: false,
  };

  // Mock httpClient.get
  const originalGet = httpClient.get;
  httpClient.get = async <T>(_url: string): Promise<T> => {
    return mockResponse as unknown as T;
  };

  try {
    setForcedOffline(false);
    const result = await syncCatalog(testUserId, true);
    assert.strictEqual(result.updated, true);
    assert.strictEqual(result.count, mockItems.length);

    // Verify local catalog_state was written
    const state = await getLocalCatalogState(testUserId);
    assert.strictEqual(state.version, 'v-snapshot-100');
    assert.ok(typeof state.synced_at === 'number');

    // Verify courses
    const courses = await getLocalCatalogCourses(testUserId);
    assert.strictEqual(courses.length, 1);
    assert.strictEqual(courses[0].id, 'crs-1');
    assert.strictEqual(parseCatalogTitle(courses[0].title, 'en'), 'Biology 101');
    assert.strictEqual(parseCatalogTitle(courses[0].title, 'am'), 'ባዮሎጂ 101');
    assert.strictEqual(parseCatalogMeta(courses[0].meta)?.stream, 'NATURAL');

    // Verify modules & topics
    const modules = await getLocalCatalogModules('crs-1', testUserId);
    assert.strictEqual(modules.length, 1);
    assert.strictEqual(modules[0].id, 'mod-1');

    const topics = await getLocalCatalogTopics('crs-1', 'mod-1', testUserId);
    assert.strictEqual(topics.length, 1);
    assert.strictEqual(topics[0].id, 'top-1');
    assert.strictEqual(parseCatalogTitle(topics[0].title, 'am'), 'የእፅዋት ሴሎች');

    // Verify quiz chapters
    const chapters = await getLocalCatalogQuizChapters('crs-1', testUserId);
    assert.strictEqual(chapters.length, 1);
    assert.strictEqual(chapters[0].id, 'qc-1');

    // Verify exams
    const exams = await getLocalCatalogExams('crs-1', testUserId);
    assert.strictEqual(exams.length, 1);
    assert.strictEqual(exams[0].id, 'ex-1');

    // Verify COC sets
    const cocSets = await getLocalCatalogCocSets(testUserId);
    assert.strictEqual(cocSets.length, 1);
    assert.strictEqual(cocSets[0].id, 'coc-1');
  } finally {
    httpClient.get = originalGet;
  }
});

test('Phase 3: Airplane mode (offline) still renders all courses, topics and exams from SQLite', async () => {
  // Simulate switching to airplane mode
  setForcedOffline(true);

  try {
    // 1. Calling online sync in airplane mode should return without network calls
    const syncResult = await syncCatalog(testUserId);
    assert.strictEqual(syncResult.updated, false);
    assert.strictEqual(syncResult.count, 0);

    // 2. Querying local SQLite returns all lists immediately without network
    const courses = await getLocalCatalogCourses(testUserId);
    assert.strictEqual(courses.length, 1);
    assert.strictEqual(courses[0].id, 'crs-1');

    const topics = await getLocalCatalogTopics('crs-1', undefined, testUserId);
    assert.strictEqual(topics.length, 1);
    assert.strictEqual(topics[0].id, 'top-1');

    const exams = await getLocalCatalogExams('crs-1', testUserId);
    assert.strictEqual(exams.length, 1);
    assert.strictEqual(exams[0].id, 'ex-1');

    const chapters = await getLocalCatalogQuizChapters('crs-1', testUserId);
    assert.strictEqual(chapters.length, 1);
    assert.strictEqual(chapters[0].id, 'qc-1');
  } finally {
    setForcedOffline(false);
  }
});

test('Phase 3: 304 Not Modified updates synced_at without modifying items', async () => {
  const originalGet = httpClient.get;
  // Return null simulating 304 Not Modified
  httpClient.get = async <T>(_url: string): Promise<T> => {
    return null as unknown as T;
  };

  try {
    setForcedOffline(false);
    const beforeState = await getLocalCatalogState(testUserId);
    const result = await syncCatalog(testUserId, true);

    assert.strictEqual(result.updated, false);
    assert.strictEqual(result.count, 0);

    const afterState = await getLocalCatalogState(testUserId);
    assert.strictEqual(afterState.version, beforeState.version);
    assert.ok((afterState.synced_at ?? 0) >= (beforeState.synced_at ?? 0));

    // Data remains intact
    const courses = await getLocalCatalogCourses(testUserId);
    assert.strictEqual(courses.length, 1);
  } finally {
    httpClient.get = originalGet;
  }
});

test('Phase 3: Delta sync applies updates and deletes tombstones atomically', async () => {
  const deltaResponse: CatalogSnapshotResponse = {
    version: 'v-snapshot-101',
    items: [
      {
        id: 'crs-2',
        kind: 'COURSE',
        courseId: 'crs-2',
        title: 'Chemistry 101',
        order: 2,
        isFree: true,
        updatedAt: Date.now(),
      },
    ],
    deletedIds: ['crs-1'], // crs-1 was deleted on server
    page: 1,
    limit: 500,
    total: 1,
    hasMore: false,
  };

  const originalGet = httpClient.get;
  httpClient.get = async <T>(_url: string): Promise<T> => {
    return deltaResponse as unknown as T;
  };

  try {
    setForcedOffline(false);
    const result = await syncCatalog(testUserId, true);
    assert.strictEqual(result.updated, true);

    // crs-1 should be deleted, crs-2 should be added
    const courses = await getLocalCatalogCourses(testUserId);
    assert.strictEqual(courses.length, 1);
    assert.strictEqual(courses[0].id, 'crs-2');
    assert.strictEqual(courses[0].title, 'Chemistry 101');

    const state = await getLocalCatalogState(testUserId);
    assert.strictEqual(state.version, 'v-snapshot-101');
  } finally {
    httpClient.get = originalGet;
  }
});
