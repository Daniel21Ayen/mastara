import {
  examSetInputSchema,
  examSetListResultSchema,
  examSetSchema,
} from '@mastara/contracts';
import type { ExamSet, ExamSetInput } from '@mastara/contracts';
import { realQuestionsApi } from '../src/modules/questions/api/questions.api';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}`, details || '');
    failed++;
  }
}

async function runQuestionsApiSpec() {
  console.log('=== Testing realQuestionsApi in admin-web ===\n');

  const originalFetch = globalThis.fetch;

  try {
    const mockExamSet: ExamSet = {
      id: 'SET-MATH-101',
      kind: 'MID',
      universityId: 'univ-1',
      universityName: 'Addis Ababa Science and Technology University',
      programId: 'prog-1',
      programName: 'Computer Science',
      semesterNumber: 1,
      stream: 'NATURAL',
      courseId: 'course-1',
      courseCode: 'CS101',
      courseTitle: 'Introduction to Programming',
      year: 2024,
      isFree: true,
      minutes: 60,
      status: 'DRAFT',
      questions: [
        {
          id: 'Q-CS-1',
          form: 'MULTIPLE_CHOICE',
          topic: 'Variables and Types',
          prompt: 'Which of the following is an immutable type?',
          options: ['List', 'Tuple', 'Dictionary', 'Set'],
          correctOption: 1,
          trueIsCorrect: null,
          acceptedAnswers: [],
          answerDescription: 'Tuples are immutable in Python.',
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const mockListResult = {
      items: [mockExamSet],
      total: 1,
      page: 1,
      pageCount: 1,
    };

    let lastUrl = '';
    let lastMethod = '';
    let lastBody = '';

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      lastUrl = String(input);
      lastMethod = init?.method ?? 'GET';
      lastBody = init?.body ? String(init.body) : '';

      if (lastUrl.includes('/assessment/admin/exam-sets/lookup/')) {
        return new Response(JSON.stringify(mockExamSet), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lastUrl.includes('/assessment/admin/exam-sets/question-owner/')) {
        return new Response(JSON.stringify({ ownerSetId: 'SET-MATH-101' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lastUrl.includes('/assessment/admin/exam-sets/') && lastMethod === 'GET') {
        return new Response(JSON.stringify(mockExamSet), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lastUrl.includes('/assessment/admin/exam-sets') && lastMethod === 'POST') {
        return new Response(JSON.stringify(mockExamSet), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lastUrl.includes('/assessment/admin/exam-sets')) {
        return new Response(JSON.stringify(mockListResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    };

    // 1. Test listSets
    console.log('Testing listSets()...');
    const list = await realQuestionsApi.listSets({ kind: 'MID', q: 'Math', page: 1 });
    assert(lastUrl.includes('kind=MID'), 'listSets includes kind parameter', lastUrl);
    assert(lastUrl.includes('q=Math'), 'listSets includes search parameter', lastUrl);
    assert(list.items.length === 1, 'Returns exam set items');
    assert(examSetListResultSchema.safeParse(list).success, 'Result conforms to examSetListResultSchema');

    // 2. Test getSet
    console.log('Testing getSet()...');
    const set = await realQuestionsApi.getSet('SET-MATH-101');
    assert(lastUrl.includes('/assessment/admin/exam-sets/SET-MATH-101'), 'getSet requests correct URL', lastUrl);
    assert(set.id === 'SET-MATH-101', 'Set ID matches');
    assert(examSetSchema.safeParse(set).success, 'Set conforms to examSetSchema');

    // 3. Test findSet
    console.log('Testing findSet()...');
    const found = await realQuestionsApi.findSet('SET-MATH-101');
    assert(lastUrl.includes('/assessment/admin/exam-sets/lookup/SET-MATH-101'), 'findSet requests lookup URL', lastUrl);
    assert(found !== null && found.id === 'SET-MATH-101', 'findSet finds the exam set');

    // 4. Test questionOwner
    console.log('Testing questionOwner()...');
    const owner = await realQuestionsApi.questionOwner('Q-CS-1');
    assert(lastUrl.includes('/assessment/admin/exam-sets/question-owner/Q-CS-1'), 'questionOwner requests correct URL', lastUrl);
    assert(owner === 'SET-MATH-101', 'questionOwner returns correct set ID', owner);

    // 5. Test saveSet
    console.log('Testing saveSet()...');
    const inputPayload: ExamSetInput = {
      id: 'SET-MATH-101',
      kind: 'MID',
      universityId: 'univ-1',
      programId: 'prog-1',
      semesterNumber: 1,
      stream: 'NATURAL',
      courseId: 'course-1',
      year: 2024,
      isFree: true,
      minutes: 60,
      status: 'DRAFT',
      questions: [
        {
          id: 'Q-CS-1',
          form: 'MULTIPLE_CHOICE',
          topic: 'Variables and Types',
          prompt: 'Which of the following is an immutable type?',
          options: ['List', 'Tuple', 'Dictionary', 'Set'],
          correctOption: 1,
          trueIsCorrect: null,
          acceptedAnswers: [],
          answerDescription: 'Tuples are immutable in Python.',
        },
      ],
    };

    const saved = await realQuestionsApi.saveSet(inputPayload);
    assert(lastMethod === 'POST', 'saveSet uses POST method', lastMethod);
    assert(lastUrl.endsWith('/assessment/admin/exam-sets'), 'saveSet posts to /assessment/admin/exam-sets', lastUrl);
    assert(saved.id === 'SET-MATH-101', 'Saved set ID matches');
    assert(examSetSchema.safeParse(saved).success, 'Saved set conforms to examSetSchema');
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runQuestionsApiSpec().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
