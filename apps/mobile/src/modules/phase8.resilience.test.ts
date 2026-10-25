// apps/mobile/src/modules/phase8.resilience.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { Topic } from '@mastara/contracts';
import { ERROR_CODES } from '@mastara/domain';

import { downloadStore, contentKey } from '../core/downloads';
import { contentApi, topicKey } from './courses/api/content.api';
import { coursesApi } from './course-list/api/courses.api';
import { syncCatalog, getLocalCatalogCourses } from '../core/sync/catalogSync';
import { outbox } from '../core/sync/outbox';
import { ApiError, httpClient } from '../core/network';

describe('Phase 8: Availability and Resilience Verification', () => {
  describe('1. Mobile Network Client: Timeouts, Backoff & Error Mapping', () => {
    it('maps 502/503/504 gateway failures to NETWORK_OFFLINE after retries', async () => {
      const originalFetch = globalThis.fetch;
      let fetchAttempts = 0;

      globalThis.fetch = (async () => {
        fetchAttempts += 1;
        return {
          ok: false,
          status: 502,
          json: async () => ({ message: 'Bad Gateway' }),
          text: async () => 'Bad Gateway',
        } as unknown as Response;
      }) as unknown as typeof fetch;

      try {
        await httpClient.get('/test/unstable-gateway', { retries: 2, retryDelayMs: 10 });
        assert.fail('Expected request to fail');
      } catch (err: any) {
        assert.strictEqual(fetchAttempts, 3, 'Should retry initial attempt + 2 retries');
        assert.strictEqual(err instanceof ApiError, true);
        assert.strictEqual(err.code, ERROR_CODES.NETWORK_OFFLINE);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('outbox continues to hold writes made offline', async () => {
      const initialPending = await outbox.pendingCount();

      const outboxId = await outbox.enqueue('ATTEMPT_FINISHED', {
        quizId: 'quiz-resilience-1',
        answers: [{ questionId: 'q-1', selectedOption: 'A' }],
        completedAt: Date.now(),
      });
      assert.ok(outboxId, 'Outbox should assign an ID');

      const pendingAfter = await outbox.pendingCount();
      assert.strictEqual(pendingAfter, initialPending + 1);

      const dueOps = await outbox.due(50, Date.now());
      const enqueued = dueOps.find((item) => item.id === outboxId);
      assert.ok(enqueued);
      assert.strictEqual(enqueued.type, 'ATTEMPT_FINISHED');

      // Cleanup
      await outbox.markApplied([outboxId]);
    });
  });

  describe('2. Catalog Sync Resilience: Never Crash on Sync Failure', () => {
    it('never throws when catalog sync fails (e.g. server down); returns updated: false', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        throw new Error('Connection Refused: API stopped');
      }) as unknown as typeof fetch;

      try {
        const result = await syncCatalog('test-user-resilience', true);
        assert.strictEqual(result.updated, false);
        assert.strictEqual(result.count, 0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('3. Core Milestone: API Stopped for 10 Minutes (Offline Survival)', () => {
    it('app still lists and opens downloaded content with NO crash when API is completely down', async () => {
      const originalFetch = globalThis.fetch;
      // Simulate API server completely down/stopped (e.g. 10 minutes downtime)
      globalThis.fetch = (async () => {
        throw new Error('TypeError: fetch failed (ECONNREFUSED 127.0.0.1:4001)');
      }) as unknown as typeof fetch;

      try {
        // Step A: Seed a downloaded topic into downloadStore via saveUnit
        const testTopicId = 'top-resilience-101';
        const testCourseId = 'crs-resilience-100';
        const downloadedTopic: Topic = {
          id: testTopicId,
          courseId: testCourseId,
          kind: 'NOTE',
          number: 1,
          title: { en: 'Offline Resilient Chapter', am: 'ከመስመር ውጭ ምዕራፍ' },
          summary: { en: 'Always accessible locally', am: 'በአካባቢው ይገኛል' },
          body: { en: 'This body was safely downloaded prior to outage.', am: 'ይህ ይዘት አስቀድሞ ወርዷል።' },
          isFree: true,
        };

        const key = topicKey(testTopicId);
        await downloadStore.saveUnit(
          {
            unitId: testTopicId,
            kind: 'TOPIC',
            courseId: testCourseId,
            title: 'Offline Resilient Chapter',
            meta: downloadedTopic,
          },
          [{ key, value: downloadedTopic }],
        );

        // Step B: Verify reading downloaded content succeeds with 0 crashes
        const openedTopic = await contentApi.getTopic(testTopicId);
        assert.ok(openedTopic, 'Downloaded topic must open successfully');
        assert.strictEqual(openedTopic.id, testTopicId);
        assert.strictEqual(openedTopic.title.en, 'Offline Resilient Chapter');
        assert.strictEqual(openedTopic.body?.en, 'This body was safely downloaded prior to outage.');

        // Step C: Verify non-downloaded topic fails gracefully with CONTENT_NOT_DOWNLOADED
        try {
          await contentApi.getTopic('top-not-downloaded');
          assert.fail('Should not open undownloaded topic when offline');
        } catch (err: any) {
          assert.strictEqual(err instanceof ApiError, true);
          assert.strictEqual(err.code, ERROR_CODES.CONTENT_NOT_DOWNLOADED);
        }

        // Step D: Verify listing topics from local catalog fallback works with no crash
        const list = await contentApi.getTopics(testCourseId, 'NOTE');
        assert.ok(Array.isArray(list), 'Should return array without crashing');
        assert.ok(list.length >= 1, 'Should find seeded downloaded topic in list');
        assert.strictEqual(list[0]?.id, testTopicId);

        // Step E: Verify course list fallback handles server downtime gracefully
        const courses = await coursesApi.getCourses('sem-1', 'NATURAL');
        assert.ok(Array.isArray(courses), 'Should return array from cache/catalog without crashing');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
