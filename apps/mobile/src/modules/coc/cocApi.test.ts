// apps/mobile/src/modules/coc/cocApi.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { cocRemote } from './api/coc.api';
import { httpClient } from '@/core/network';

test('coc: real API client gets sets and exam session', async () => {
  const origGet = httpClient.get;
  let calls = 0;

  (httpClient as any).get = async (path: string) => {
    calls += 1;
    if (path === '/assessment/coc/sets') {
      return [
        {
          id: 'coc-set-1',
          title: { en: 'National Exit Exam 2024', am: 'ብሔራዊ የመውጫ ፈተና 2024' },
          courseIds: ['c1', 'c2'],
          questionCount: 100,
          durationMinutes: 180,
          isFree: false,
        },
      ];
    }
    if (path.includes('/assessment/coc/sets/coc-set-1/session')) {
      return {
        set: {
          id: 'coc-set-1',
          title: { en: 'National Exit Exam 2024', am: 'ብሔራዊ የመውጫ ፈተና 2024' },
          courseIds: ['c1', 'c2'],
          questionCount: 2,
          durationMinutes: 180,
          isFree: false,
        },
        questions: [
          {
            id: 'coc-q1',
            type: 'SINGLE',
            prompt: { en: 'Select the primary database model.', am: 'ዋናውን የዳታቤዝ ሞዴል ምረጥ።' },
            options: [
              { id: 'opt1', label: { en: 'Relational', am: 'ሪሌሽናል' } },
              { id: 'opt2', label: { en: 'Flat file', am: 'ፍላት ፋይል' } },
            ],
            correctOptionIds: ['opt1'],
          },
        ],
        courseTitles: {
          c1: 'Database Systems',
          c2: 'Software Engineering',
        },
      };
    }
    return null;
  };

  try {
    const sets = await cocRemote.getSets(['c1', 'c2']);
    assert.equal(sets.length, 1);
    assert.equal(sets[0]?.id, 'coc-set-1');

    const session = await cocRemote.getSession('coc-set-1', ['c1', 'c2']);
    assert.ok(session);
    assert.equal(session.questions.length, 1);
    assert.equal(session.courseTitles['c1'], 'Database Systems');
    assert.equal(calls, 2);
  } finally {
    httpClient.get = origGet;
  }
});
