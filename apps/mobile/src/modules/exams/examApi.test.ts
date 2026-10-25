// apps/mobile/src/modules/exams/examApi.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { examRemote, realExamApi } from './api/exam.api';
import { httpClient } from '@/core/network';

test('exams: real API client gets exams and exam session', async () => {
  const origGet = httpClient.get;
  let calls = 0;

  (httpClient as any).get = async (path: string) => {
    calls += 1;
    if (path.includes('/assessment/exams/courses/course-math-101')) {
      return [
        {
          exam: {
            id: 'exam-mid-1',
            title: { en: 'Calculus Midterm Exam', am: 'የካልኩለስ አጋማሽ ፈተና' },
            kind: 'MIDTERM',
            courseId: 'course-math-101',
            year: 2024,
            durationMinutes: 90,
            questionCount: 30,
            isFree: false,
          },
          university: {
            id: 'u-aau',
            code: 'AAU',
            name: { en: 'Addis Ababa University', am: 'አዲስ አበባ ዩኒቨርሲቲ' },
          },
        },
      ];
    }
    if (path.includes('/assessment/exams/exam-mid-1/session')) {
      return {
        exam: {
          id: 'exam-mid-1',
          title: { en: 'Calculus Midterm Exam', am: 'የካልኩለስ አጋማሽ ፈተና' },
          kind: 'MIDTERM',
          courseId: 'course-math-101',
          year: 2024,
          durationMinutes: 90,
          questionCount: 1,
          isFree: false,
        },
        university: {
          id: 'u-aau',
          code: 'AAU',
          name: { en: 'Addis Ababa University', am: 'አዲስ አበባ ዩኒቨርሲቲ' },
        },
        questions: [
          {
            id: 'q-calc-1',
            type: 'SINGLE',
            prompt: { en: 'What is derivative of sin(x)?', am: 'የ sin(x) ዲሪቫቲቭ ምንድን ነው?' },
            options: [
              { id: 'opt-cos', label: { en: 'cos(x)', am: 'cos(x)' } },
              { id: 'opt-sin', label: { en: '-sin(x)', am: '-sin(x)' } },
            ],
            correctOptionIds: ['opt-cos'],
          },
        ],
      };
    }
    return null;
  };

  try {
    const exams = await examRemote.getExams('course-math-101', 'MIDTERM');
    assert.equal(exams.length, 1);
    assert.equal(exams[0]?.exam.id, 'exam-mid-1');
    assert.equal(exams[0]?.university.code, 'AAU');

    const session = await examRemote.getSession('exam-mid-1');
    assert.ok(session);
    assert.equal(session.questions.length, 1);
    assert.equal(session.questions[0]?.id, 'q-calc-1');
    assert.equal(calls, 2);
  } finally {
    httpClient.get = origGet;
  }
});
