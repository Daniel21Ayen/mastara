import {
  adminModuleSchema,
  adminNoteSchema,
  adminTopicSchema,
  contentCourseSchema,
  contentSummarySchema,
} from '@mastara/contracts';
import { realContentApi } from '../src/modules/content/api/content.api';

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

async function runContentApiTests() {
  console.log('=== Testing realContentApi in admin-web ===\n');

  const originalFetch = globalThis.fetch;

  try {
    const mockCourse = {
      id: 'course-1',
      code: 'CS101',
      title: 'Computer Science 101',
      programName: 'Software Engineering',
      universityShortName: 'AAU',
    };

    const mockSummary = {
      courseId: 'course-1',
      moduleCount: 4,
      publishedModuleCount: 3,
      topicCount: 16,
      noteCount: 12,
      amharicNoteCount: 8,
      quizCount: 3,
      recent: [
        {
          id: 'mod-1',
          kind: 'MODULE' as const,
          title: 'Module 1 · Introduction',
          moduleNumber: 1,
          at: new Date().toISOString(),
        },
      ],
    };

    const mockTopic = {
      id: 'topic-1',
      moduleId: 'mod-1',
      number: 1,
      code: '1.1',
      title: { en: 'Asymptotic Analysis', am: 'አሲምፕቶቲክ ትንተና' },
    };

    const mockModule = {
      id: 'mod-1',
      courseId: 'course-1',
      number: 1,
      title: { en: 'Module 1 - Foundations', am: 'ክፍል 1 - መሰረታዊያን' },
      status: 'PUBLISHED' as const,
      topics: [mockTopic],
      notes: [{ id: 'note-1', title: 'Big-O Summary' }],
      updatedAt: new Date().toISOString(),
    };

    const mockNote = {
      id: 'note-1',
      courseId: 'course-1',
      moduleId: 'mod-1',
      moduleNumber: 1,
      title: { en: 'Big-O Summary', am: 'ቢግ-ኦ ማጠቃለያ' },
      body: { en: 'Growth rate is $O(n)$', am: 'የእድገት መጠን $O(n)$ ነው' },
      isFree: true,
      status: 'PUBLISHED' as const,
      version: 1,
      updatedAt: new Date().toISOString(),
    };

    let lastRequestUrl = '';
    let lastRequestMethod = '';
    let lastRequestBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      lastRequestUrl = url.toString();
      lastRequestMethod = init?.method ?? 'GET';
      lastRequestBody = init?.body ? JSON.parse(init.body) : null;

      let responseData: any = {};

      if (lastRequestUrl.endsWith('/content/admin/courses')) {
        responseData = [mockCourse];
      } else if (lastRequestUrl.includes('/summary')) {
        responseData = mockSummary;
      } else if (lastRequestUrl.endsWith('/content/admin/courses/course-1/modules')) {
        responseData = [mockModule];
      } else if (lastRequestUrl.endsWith('/content/admin/modules') && lastRequestMethod === 'POST') {
        responseData = { ...mockModule, ...lastRequestBody };
      } else if (lastRequestUrl.includes('/content/admin/modules/') && lastRequestMethod === 'PUT') {
        responseData = { ...mockModule, ...lastRequestBody };
      } else if (lastRequestUrl.endsWith('/content/admin/topics') && lastRequestMethod === 'POST') {
        responseData = { ...mockTopic, ...lastRequestBody };
      } else if (lastRequestUrl.endsWith('/content/admin/courses/course-1/notes')) {
        responseData = [mockNote];
      } else if (lastRequestUrl.endsWith('/content/admin/notes') && lastRequestMethod === 'POST') {
        responseData = { ...mockNote, ...lastRequestBody };
      } else if (lastRequestUrl.includes('/amharic') && lastRequestMethod === 'PUT') {
        responseData = {
          ...mockNote,
          title: { ...mockNote.title, am: lastRequestBody.title },
          body: { ...mockNote.body, am: lastRequestBody.body },
          version: mockNote.version + 1,
        };
      } else if (lastRequestUrl.includes('/content/admin/notes/') && lastRequestMethod === 'PUT') {
        responseData = { ...mockNote, ...lastRequestBody };
      }

      return new Response(JSON.stringify(responseData), {
        status: lastRequestMethod === 'POST' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    // 1. listCourses
    const courses = await realContentApi.listCourses();
    assert(lastRequestUrl.includes('/content/admin/courses'), 'listCourses calls /content/admin/courses');
    assert(courses.length === 1, 'listCourses returns 1 course');
    const parsedCourse = contentCourseSchema.safeParse(courses[0]);
    assert(parsedCourse.success, 'Validated contentCourseSchema');

    // 2. getSummary
    const summary = await realContentApi.getSummary('course-1');
    assert(lastRequestUrl.includes('/content/admin/courses/course-1/summary'), 'getSummary sends GET to course summary');
    assert(summary.moduleCount === 4, 'summary moduleCount is 4');
    const parsedSummary = contentSummarySchema.safeParse(summary);
    assert(parsedSummary.success, 'Validated contentSummarySchema');

    // 3. listModules
    const modules = await realContentApi.listModules('course-1');
    assert(lastRequestUrl.includes('/content/admin/courses/course-1/modules'), 'listModules sends GET');
    assert(modules.length === 1, 'listModules returns 1 module');
    const parsedMod = adminModuleSchema.safeParse(modules[0]);
    assert(parsedMod.success, 'Validated adminModuleSchema');

    // 4. createModule
    const createdMod = await realContentApi.createModule({
      courseId: 'course-1',
      title: { en: 'Module 1 - Foundations', am: 'ክፍል 1 - መሰረታዊያን' },
      status: 'PUBLISHED',
    });
    assert(lastRequestMethod === 'POST', 'createModule sends POST');
    assert(createdMod.number === 1, 'createdModule returns number 1');
    assert(adminModuleSchema.safeParse(createdMod).success, 'Validated createModule schema');

    // 5. updateModule
    const updatedMod = await realContentApi.updateModule('mod-1', {
      courseId: 'course-1',
      title: { en: 'Module 1 - Advanced Foundations', am: 'ክፍል 1 - የላቁ መሰረታዊያን' },
      status: 'PUBLISHED',
    });
    assert(lastRequestMethod === 'PUT', 'updateModule sends PUT');
    assert(adminModuleSchema.safeParse(updatedMod).success, 'Validated updateModule schema');

    // 6. addTopic
    const createdTopic = await realContentApi.addTopic({
      moduleId: 'mod-1',
      title: { en: 'Asymptotic Analysis', am: 'አሲምፕቶቲክ ትንተና' },
    });
    assert(lastRequestMethod === 'POST', 'addTopic sends POST');
    assert(createdTopic.code === '1.1', 'createdTopic code is 1.1');
    assert(adminTopicSchema.safeParse(createdTopic).success, 'Validated adminTopicSchema');

    // 7. listNotes
    const notes = await realContentApi.listNotes('course-1');
    assert(lastRequestUrl.includes('/content/admin/courses/course-1/notes'), 'listNotes sends GET');
    assert(notes.length === 1, 'listNotes returns 1 note');
    assert(adminNoteSchema.safeParse(notes[0]).success, 'Validated adminNoteSchema');

    // 8. createNote
    const createdNote = await realContentApi.createNote({
      courseId: 'course-1',
      moduleId: 'mod-1',
      title: { en: 'Big-O Summary', am: 'ቢግ-ኦ ማጠቃለያ' },
      body: { en: 'Growth rate is $O(n)$', am: 'የእድገት መጠን $O(n)$ ነው' },
      isFree: true,
      status: 'PUBLISHED',
    });
    assert(lastRequestMethod === 'POST', 'createNote sends POST');
    assert(createdNote.version === 1, 'createdNote version is 1');
    assert(adminNoteSchema.safeParse(createdNote).success, 'Validated createNote schema');

    // 9. updateNote
    const updatedNote = await realContentApi.updateNote('note-1', {
      courseId: 'course-1',
      moduleId: 'mod-1',
      title: { en: 'Big-O & Theta Summary', am: 'ቢግ-ኦ እና ቴታ ማጠቃለያ' },
      body: { en: 'Growth rate is $O(n)$ and $\\Theta(n)$', am: 'የእድገት መጠን' },
      isFree: true,
      status: 'PUBLISHED',
    });
    assert(lastRequestMethod === 'PUT', 'updateNote sends PUT');
    assert(adminNoteSchema.safeParse(updatedNote).success, 'Validated updateNote schema');

    // 10. saveAmharicNote
    const amharicNote = await realContentApi.saveAmharicNote('note-1', {
      title: 'ቢግ-ኦ የተሻሻለ አማርኛ ርዕስ',
      body: 'የተሟላ የአማርኛ ዝርዝር መግለጫ',
    });
    assert(lastRequestUrl.includes('/amharic'), 'saveAmharicNote calls /amharic');
    assert(amharicNote.version === 2, 'saveAmharicNote bumped version to 2');
    assert(adminNoteSchema.safeParse(amharicNote).success, 'Validated saveAmharicNote schema');

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runContentApiTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
