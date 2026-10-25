// apps/mobile/src/modules/quizzes/quizApi.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { quizRemote, realQuizApi } from './api/quiz.api';
import { httpClient } from '@/core/network';

test('quizzes / tests: real API client with chapters and questions', async () => {
  const origGet = httpClient.get;
  let calls = 0;

  (httpClient as any).get = async (path: string) => {
    calls += 1;
    if (path.includes('/assessment/quizzes/courses/c1/chapters')) {
      return [
        {
          id: 'qch1',
          courseId: 'c1',
          quizNo: 1,
          chapterNumber: 1,
          title: { en: 'Chapter 1 Practice', am: 'ምዕራፍ 1 ልምምድ' },
          questionCount: 15,
          minutes: 30,
          isFree: true,
        },
      ];
    }
    if (path.includes('/assessment/quizzes/chapters/qch1/questions')) {
      return [
        {
          id: 'q1',
          type: 'SINGLE',
          prompt: { en: 'Evaluate limit of 1/x as x->infinity', am: 'ገምግም' },
          options: [
            { id: 'opt1', label: { en: '0', am: '0' } },
            { id: 'opt2', label: { en: '1', am: '1' } },
          ],
          correctOptionIds: ['opt1'],
        },
      ];
    }
    return [];
  };

  try {
    const chapters = await quizRemote.getChapters('c1', 1);
    assert.equal(chapters.length, 1);
    assert.equal(chapters[0]?.title.en, 'Chapter 1 Practice');

    const questions = await quizRemote.getQuestions('qch1');
    assert.equal(questions.length, 1);
    assert.equal(questions[0]?.id, 'q1');
    assert.equal(calls, 2);
  } finally {
    httpClient.get = origGet;
  }
});
