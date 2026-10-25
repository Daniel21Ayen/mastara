// apps/mobile/src/modules/courses/contentApi.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { contentRemote, realContentApi } from './api/content.api';
import { httpClient } from '@/core/network';

test('content: real API client with syllabus and topic endpoints', async () => {
  const origGet = httpClient.get;
  let calls = 0;

  (httpClient as any).get = async (path: string) => {
    calls += 1;
    if (path.includes('/content/courses/c1/topics')) {
      return [
        {
          id: 't1',
          courseId: 'c1',
          kind: 'MODULE',
          number: 1,
          title: { en: 'Limits and Continuity', am: 'ወሰኖች እና ቀጣይነት' },
          summary: { en: 'Calculus fundamentals', am: 'የካልኩለስ መሠረታዊ' },
          body: { en: 'Detailed content', am: 'ይዘት' },
          isFree: true,
        },
      ];
    }
    if (path.includes('/content/topics/t1')) {
      return {
        id: 't1',
        courseId: 'c1',
        kind: 'MODULE',
        number: 1,
        title: { en: 'Limits and Continuity', am: 'ወሰኖች እና ቀጣይነት' },
        summary: { en: 'Calculus fundamentals', am: 'የካልኩለስ መሠረታዊ' },
        body: { en: 'Detailed content', am: 'ይዘት' },
        isFree: true,
      };
    }
    return null;
  };

  try {
    const topics = await contentRemote.getTopics('c1', 'MODULE');
    assert.equal(topics.length, 1);
    assert.equal(topics[0]?.title.en, 'Limits and Continuity');
    assert.equal(topics[0]?.isFree, true);

    const topic = await contentRemote.getTopic('t1');
    assert.ok(topic);
    assert.equal(topic?.id, 't1');
    assert.equal(calls, 2);
  } finally {
    httpClient.get = origGet;
  }
});
