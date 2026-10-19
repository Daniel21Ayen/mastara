import {
  adminScanSchema,
  scanCourseOptionSchema,
  scanInputSchema,
  scanListResultSchema,
} from '@mastara/contracts';
import type { AdminScan, ScanCourseOption, ScanInput, ScanListResult } from '@mastara/contracts';
import { realScansApi } from '../src/modules/scans/api/scans.api';

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

async function runScansApiSpec() {
  console.log('=== Testing realScansApi in admin-web ===\n');

  const originalFetch = globalThis.fetch;

  try {
    const mockScan: AdminScan = {
      id: 'SC-1001',
      kind: 'QUIZ',
      subKind: '2',
      examSetId: 'QS-204',
      universityShortName: 'AASTU',
      programName: 'Software Engineering',
      semesterNumber: 1,
      stream: 'COMMON',
      courseCode: 'ENG101',
      courseTitle: 'Communicative English',
      year: null,
      topicLabel: '1.1 Introduction',
      title: 'Quiz 2 paper scan',
      description: 'Scanned from teacher copy.',
      pages: [
        { name: 'p1.jpg', mime: 'image/jpeg', sizeBytes: 420000 },
        { name: 'p2.jpg', mime: 'image/jpeg', sizeBytes: 395000 },
      ],
      answers: [
        { questionId: 'Q-1', questionType: null, text: 'B', file: null },
      ],
      createdAt: new Date().toISOString(),
    };

    const mockListResult: ScanListResult = {
      items: [mockScan],
      total: 1,
      page: 1,
      pageCount: 1,
    };

    const mockCourses: ScanCourseOption[] = [
      { id: 'c-1', code: 'ENG101', title: 'Communicative English' },
      { id: 'c-2', code: 'LOG101', title: 'Logic and Critical Thinking' },
    ];

    let lastUrl = '';
    let lastMethod = '';
    let lastBody = '';

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      lastUrl = String(input);
      lastMethod = init?.method ?? 'GET';
      lastBody = init?.body ? String(init.body) : '';

      if (lastUrl.includes('/content/admin/scans/courses')) {
        return new Response(JSON.stringify(mockCourses), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lastUrl.includes('/content/admin/scans/') && lastMethod === 'GET') {
        return new Response(JSON.stringify(mockScan), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lastUrl.includes('/content/admin/scans') && lastMethod === 'POST') {
        return new Response(JSON.stringify(mockScan), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lastUrl.includes('/content/admin/scans') && lastMethod === 'GET') {
        return new Response(JSON.stringify(mockListResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    };

    // 1. Test listScans
    console.log('Testing listScans()...');
    const list = await realScansApi.listScans({ kind: 'QUIZ', q: 'English', page: 1 });
    assert(lastUrl.includes('kind=QUIZ'), 'listScans includes kind parameter', lastUrl);
    assert(lastUrl.includes('q=English'), 'listScans includes search parameter', lastUrl);
    assert(lastUrl.includes('page=1'), 'listScans includes page parameter', lastUrl);
    assert(list.items.length === 1, 'Returns scan items');
    assert(scanListResultSchema.safeParse(list).success, 'Result conforms to scanListResultSchema');

    // 2. Test getScan
    console.log('Testing getScan()...');
    const scan = await realScansApi.getScan('SC-1001');
    assert(lastUrl.includes('/content/admin/scans/SC-1001'), 'getScan requests correct URL', lastUrl);
    assert(scan.id === 'SC-1001', 'Scan ID matches');
    assert(adminScanSchema.safeParse(scan).success, 'Scan conforms to adminScanSchema');

    // 3. Test listCourses
    console.log('Testing listCourses()...');
    const courses = await realScansApi.listCourses('aastu-se', 1, 'COMMON');
    assert(lastUrl.includes('programId=aastu-se'), 'listCourses includes programId', lastUrl);
    assert(lastUrl.includes('semesterNumber=1'), 'listCourses includes semesterNumber', lastUrl);
    assert(lastUrl.includes('stream=COMMON'), 'listCourses includes stream', lastUrl);
    assert(courses.length === 2, 'Returns course options');
    assert(scanCourseOptionSchema.safeParse(courses[0]).success, 'First course conforms to scanCourseOptionSchema');

    // 4. Test createScan
    console.log('Testing createScan()...');
    const inputPayload: ScanInput = {
      kind: 'COC',
      pages: [{ name: 'page1.pdf', mime: 'application/pdf', sizeBytes: 250000 }],
      universityId: 'aastu',
      programId: 'aastu-se',
      year: 2026,
      answers: [
        { questionId: '1', text: 'Answer explanation', file: null },
      ],
    };

    const created = await realScansApi.createScan(inputPayload);
    assert(lastMethod === 'POST', 'createScan uses POST method', lastMethod);
    assert(lastUrl.endsWith('/content/admin/scans'), 'createScan posts to /content/admin/scans', lastUrl);
    assert(created.id === 'SC-1001', 'Created scan ID matches');
    assert(adminScanSchema.safeParse(created).success, 'Created scan conforms to adminScanSchema');
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runScansApiSpec().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
