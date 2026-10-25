// apps/mobile/src/modules/home/homeApi.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { homeApi, realHomeApi } from './api/home.api';
import { httpClient } from '@/core/network';

test('home: real API client with SQLite cache', async () => {
  const origGet = httpClient.get;
  let networkCalls = 0;

  (httpClient as any).get = async (path: string) => {
    if (path.includes('/learning/home-summary')) {
      networkCalls += 1;
      return {
        chaptersDone: 14,
        chaptersTotal: 48,
        activeProducts: 2,
        pendingProducts: 0,
        recent: [
          { id: 'r1', kind: 'TOPIC', title: 'Calculus Limits', courseId: 'c1', accessedAt: new Date().toISOString() },
        ],
      };
    }
    return null;
  };

  try {
    const summary = await homeApi.getSummary('u1', {
      universityId: 'uni-1',
      programId: 'prog-1',
      semesterId: 'sem-1',
      stream: 'NATURAL',
      courseIds: ['c1'],
    });

    assert.equal(summary.chaptersDone, 14);
    assert.equal(summary.chaptersTotal, 48);
    assert.equal(summary.activeProducts, 2);
    assert.equal(summary.recent.length, 1);
    assert.equal(networkCalls, 1);
  } finally {
    httpClient.get = origGet;
  }
});
