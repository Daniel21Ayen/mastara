import {
  adminQuestionSchema,
  questionListResultSchema,
  quizSummarySchema,
  testsOverviewSchema,
} from '@mastara/contracts';
import { realTestsApi } from '../src/modules/tests/api/tests.api';

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

async function runTestsApiSpec() {
  console.log('=== Testing realTestsApi in admin-web ===\n');

  const originalFetch = globalThis.fetch;

  try {
    const mockOverview = {
      courseId: 'course-uuid-1',
      quizzes: [
        {
          quizNo: 1 as const,
          questionCount: 10,
          publishedQuestionCount: 8,
          minutes: 20,
          status: 'PUBLISHED' as const,
        },
        {
          quizNo: 2 as const,
          questionCount: 5,
          publishedQuestionCount: 5,
          minutes: 25,
          status: 'PUBLISHED' as const,
        },
        {
          quizNo: 3 as const,
          questionCount: 0,
          publishedQuestionCount: 0,
          minutes: 30,
          status: 'DRAFT' as const,
        },
      ],
      recent: [
        {
          id: 'q-1',
          quizNo: 1 as const,
          title: 'Binary search worst-case',
          status: 'PUBLISHED' as const,
          at: new Date().toISOString(),
        },
      ],
    };

    const mockQuestion = {
      id: 'q-1',
      courseId: 'course-uuid-1',
      courseCode: 'CS101',
      courseTitle: 'Computer Science 101',
      quizNo: 1 as const,
      topicId: 'topic-1',
      topicLabel: '1.1 Time Complexity',
      title: 'Binary search worst-case',
      form: 'MULTIPLE_CHOICE' as const,
      prompt: 'What is the worst-case complexity of binary search?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
      correctOption: 1,
      trueIsCorrect: null,
      acceptedAnswers: [],
      status: 'PUBLISHED' as const,
      updatedAt: new Date().toISOString(),
      nextId: 'q-2',
    };

    let lastRequestUrl = '';
    let lastRequestMethod = '';
    let lastRequestBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      lastRequestUrl = url.toString();
      lastRequestMethod = init?.method ?? 'GET';
      lastRequestBody = init?.body ? JSON.parse(init.body) : null;

      let responseData: any = {};

      if (lastRequestUrl.includes('/tests-overview')) {
        responseData = mockOverview;
      } else if (lastRequestUrl.includes('/quizzes/1') && lastRequestMethod === 'PUT') {
        responseData = {
          quizNo: 1,
          questionCount: 10,
          publishedQuestionCount: 8,
          minutes: lastRequestBody.minutes,
          status: lastRequestBody.status,
        };
      } else if (lastRequestUrl.endsWith('/questions') && lastRequestMethod === 'POST') {
        responseData = {
          ...mockQuestion,
          ...lastRequestBody,
          id: 'q-new-created',
        };
      } else if (lastRequestUrl.includes('/questions/') && lastRequestMethod === 'PUT') {
        responseData = {
          ...mockQuestion,
          ...lastRequestBody,
        };
      } else if (lastRequestUrl.includes('/questions/') && lastRequestMethod === 'GET') {
        responseData = mockQuestion;
      } else if (lastRequestUrl.includes('/questions')) {
        responseData = {
          items: [mockQuestion],
          total: 1,
          page: 1,
          pageCount: 1,
        };
      }

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    // Test 1: getOverview
    const overview = await realTestsApi.getOverview('course-uuid-1');
    assert(
      lastRequestUrl.endsWith('/assessment/admin/courses/course-uuid-1/tests-overview'),
      'getOverview calls correct endpoint URL',
    );
    assert(testsOverviewSchema.safeParse(overview).success, 'Overview parsed with schema');
    assert(overview.quizzes.length === 3, 'Overview contains 3 quizzes');

    // Test 2: updateQuiz
    const updatedQuiz = await realTestsApi.updateQuiz('course-uuid-1', 1, {
      minutes: 35,
      status: 'PUBLISHED',
    });
    assert(
      lastRequestUrl.endsWith('/assessment/admin/courses/course-uuid-1/quizzes/1'),
      'updateQuiz calls PUT on quiz endpoint',
    );
    assert(lastRequestMethod === 'PUT', 'updateQuiz uses PUT method');
    assert(lastRequestBody.minutes === 35, 'Payload contains updated minutes');
    assert(quizSummarySchema.safeParse(updatedQuiz).success, 'Quiz summary parsed with schema');
    assert(updatedQuiz.minutes === 35, 'Response reflects updated minutes');

    // Test 3: listQuestions with filters
    const list = await realTestsApi.listQuestions({
      quizNo: 1,
      courseId: 'course-uuid-1',
      form: 'MULTIPLE_CHOICE',
      status: 'PUBLISHED',
      q: 'binary',
      page: 1,
    });
    assert(
      lastRequestUrl.includes('quizNo=1') &&
        lastRequestUrl.includes('courseId=course-uuid-1') &&
        lastRequestUrl.includes('form=MULTIPLE_CHOICE') &&
        lastRequestUrl.includes('status=PUBLISHED') &&
        lastRequestUrl.includes('q=binary') &&
        lastRequestUrl.includes('page=1'),
      'listQuestions properly serializes query parameters',
    );
    assert(questionListResultSchema.safeParse(list).success, 'QuestionListResult parsed with schema');
    assert(list.items.length === 1, 'Question list has 1 item');

    // Test 4: getQuestion
    const fetchedQ = await realTestsApi.getQuestion('q-1');
    assert(
      lastRequestUrl.endsWith('/assessment/admin/questions/q-1'),
      'getQuestion calls GET on question ID endpoint',
    );
    assert(adminQuestionSchema.safeParse(fetchedQ).success, 'Fetched question parsed with schema');
    assert(fetchedQ.id === 'q-1', 'Fetched question matches ID');

    // Test 5: createQuestion
    const createdQ = await realTestsApi.createQuestion({
      courseId: 'course-uuid-1',
      quizNo: 1,
      topicId: 'topic-1',
      title: 'New question title',
      form: 'MULTIPLE_CHOICE',
      prompt: 'New question prompt text',
      options: ['Option 1', 'Option 2'],
      correctOption: 0,
      trueIsCorrect: null,
      acceptedAnswers: [],
      status: 'DRAFT',
    });
    assert(
      lastRequestUrl.endsWith('/assessment/admin/questions') && lastRequestMethod === 'POST',
      'createQuestion sends POST to /assessment/admin/questions',
    );
    assert(lastRequestBody.title === 'New question title', 'POST body contains question data');
    assert(adminQuestionSchema.safeParse(createdQ).success, 'Created question parsed with schema');

    // Test 6: updateQuestion
    const updatedQ = await realTestsApi.updateQuestion('q-1', {
      courseId: 'course-uuid-1',
      quizNo: 1,
      topicId: 'topic-1',
      title: 'Updated question title',
      form: 'MULTIPLE_CHOICE',
      prompt: 'Updated question prompt text',
      options: ['Option 1', 'Option 2'],
      correctOption: 1,
      trueIsCorrect: null,
      acceptedAnswers: [],
      status: 'PUBLISHED',
    });
    assert(
      lastRequestUrl.endsWith('/assessment/admin/questions/q-1') && lastRequestMethod === 'PUT',
      'updateQuestion sends PUT to /assessment/admin/questions/q-1',
    );
    assert(lastRequestBody.title === 'Updated question title', 'PUT body contains updated title');
    assert(adminQuestionSchema.safeParse(updatedQ).success, 'Updated question parsed with schema');

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTestsApiSpec().catch((err) => {
  console.error('Unhandled error in tests-api.spec:', err);
  process.exit(1);
});
