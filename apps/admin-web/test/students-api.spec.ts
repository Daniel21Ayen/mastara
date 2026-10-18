import {
  studentDetailSchema,
  studentListResultSchema,
} from '@mastara/contracts';
import { httpClient } from '../src/core/network/httpClient';
import { realStudentsApi } from '../src/modules/students/api/students.api';

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

async function runStudentsApiTests() {
  console.log('=== Testing realStudentsApi in admin-web ===\n');

  const originalFetch = globalThis.fetch;

  try {
    const mockStudentSummary = {
      id: 'student-uuid-1',
      name: 'Abebe Kebede',
      identifier: '+251911223344',
      universityId: 'uni-1',
      universityShortName: 'AAU',
      stream: 'NATURAL',
      courseCount: 2,
      status: 'ACTIVE',
      device: 'BOUND',
      access: 'PAID',
    };

    const mockStudentDetail = {
      ...mockStudentSummary,
      programName: 'Pre-Engineering',
      semesterNumber: 1,
      boundAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      courses: [
        {
          courseId: 'c-1',
          code: 'MATH101',
          title: 'Calculus I',
          stream: 'NATURAL',
          access: 'PAID',
          expiresAt: new Date(Date.now() + 864000000).toISOString(),
        },
        {
          courseId: 'c-2',
          code: 'PHYS101',
          title: 'General Physics',
          stream: 'COMMON',
          access: 'FREE_TRIAL',
        },
      ],
    };

    const mockListResult = {
      items: [mockStudentSummary],
      total: 1,
      page: 1,
      pageCount: 1,
    };

    const mockOptions = {
      universities: [{ id: 'uni-1', name: 'Addis Ababa University', shortName: 'AAU' }],
      programs: [{ id: 'prog-1', universityId: 'uni-1', name: 'Pre-Engineering' }],
      semesters: [{ id: 'sem-1', programId: 'prog-1', number: 1 }],
    };

    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedMethod = init?.method || 'GET';
      capturedBody = String(init?.body || '');

      if (capturedUrl.includes('/identity/students/options')) {
        return new Response(JSON.stringify(mockOptions), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (capturedUrl.includes('/identity/students/student-uuid-1/suspend')) {
        return new Response(
          JSON.stringify({
            ...mockStudentDetail,
            status: 'SUSPENDED',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (capturedUrl.includes('/identity/students/student-uuid-1/reactivate')) {
        return new Response(
          JSON.stringify({
            ...mockStudentDetail,
            status: 'ACTIVE',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (capturedUrl.includes('/identity/students/student-uuid-1/revoke-device')) {
        return new Response(
          JSON.stringify({
            ...mockStudentDetail,
            device: 'RELEASED',
            boundAt: undefined,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (capturedUrl.includes('/identity/students/student-uuid-1/grant-access')) {
        return new Response(
          JSON.stringify({
            ...mockStudentDetail,
            courses: [
              {
                ...mockStudentDetail.courses[0],
                expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
              },
              mockStudentDetail.courses[1],
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (capturedUrl.includes('/identity/students/student-uuid-1')) {
        return new Response(JSON.stringify(mockStudentDetail), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (capturedMethod === 'POST' && capturedUrl.endsWith('/identity/students')) {
        const body = JSON.parse(capturedBody);
        return new Response(
          JSON.stringify({
            ...mockStudentDetail,
            name: body.name,
            identifier: body.identifier,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify(mockListResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    httpClient.setToken('admin-test-token');

    // 1. Test list
    const listResponse = await realStudentsApi.list({
      q: 'Abebe',
      universityId: 'uni-1',
      stream: 'NATURAL',
      access: 'PAID',
      page: 1,
    });
    assert(capturedMethod === 'GET', 'list sends GET request');
    assert(
      capturedUrl.includes('/api/v1/identity/students?q=Abebe&universityId=uni-1&stream=NATURAL&access=PAID&page=1'),
      'list formats query parameters correctly',
    );
    assert(listResponse.items.length === 1, 'list returns 1 item');
    assert(studentListResultSchema.safeParse(listResponse).success, 'Validated against studentListResultSchema');

    // 2. Test getOptions
    const optionsResponse = await realStudentsApi.getOptions();
    assert(capturedUrl.includes('/api/v1/identity/students/options'), 'getOptions calls /identity/students/options');
    assert(optionsResponse.universities.length === 1, 'getOptions returns universities');

    // 3. Test get
    const detailResponse = await realStudentsApi.get('student-uuid-1');
    assert(capturedUrl.includes('/api/v1/identity/students/student-uuid-1'), 'get calls /identity/students/:id');
    assert(detailResponse.id === 'student-uuid-1', 'get returns requested student');
    assert(studentDetailSchema.safeParse(detailResponse).success, 'Validated against studentDetailSchema');

    // 4. Test create
    const createdResponse = await realStudentsApi.create({
      name: 'Kalkidan Bekele',
      identifier: '+251922334455',
      universityId: 'uni-1',
      programId: 'prog-1',
      semesterId: 'sem-1',
      stream: 'NATURAL',
    });
    assert(capturedMethod === 'POST', 'create sends POST request');
    assert(createdResponse.name === 'Kalkidan Bekele', 'create returns created student');
    assert(studentDetailSchema.safeParse(createdResponse).success, 'Validated create response schema');

    // 5. Test suspend
    const suspendedResponse = await realStudentsApi.suspend('student-uuid-1', {
      reason: 'Academic integrity investigation',
    });
    assert(capturedMethod === 'POST', 'suspend sends POST request');
    assert(
      capturedUrl.includes('/api/v1/identity/students/student-uuid-1/suspend'),
      'suspend calls /identity/students/:id/suspend',
    );
    assert(suspendedResponse.status === 'SUSPENDED', 'suspend returns status SUSPENDED');
    assert(studentDetailSchema.safeParse(suspendedResponse).success, 'Validated suspend response schema');

    // 6. Test reactivate
    const reactivatedResponse = await realStudentsApi.reactivate('student-uuid-1', {
      reason: 'Reinstatement approved by dean',
    });
    assert(capturedMethod === 'POST', 'reactivate sends POST request');
    assert(
      capturedUrl.includes('/api/v1/identity/students/student-uuid-1/reactivate'),
      'reactivate calls /identity/students/:id/reactivate',
    );
    assert(reactivatedResponse.status === 'ACTIVE', 'reactivate returns status ACTIVE');
    assert(studentDetailSchema.safeParse(reactivatedResponse).success, 'Validated reactivate response schema');

    // 7. Test revokeDevice
    const revokedResponse = await realStudentsApi.revokeDevice('student-uuid-1', {
      reason: 'Phone stolen and reported by user',
    });
    assert(capturedMethod === 'POST', 'revokeDevice sends POST request');
    assert(
      capturedUrl.includes('/api/v1/identity/students/student-uuid-1/revoke-device'),
      'revokeDevice calls /identity/students/:id/revoke-device',
    );
    assert(revokedResponse.device === 'RELEASED', 'revokeDevice returns device RELEASED');
    assert(studentDetailSchema.safeParse(revokedResponse).success, 'Validated revokeDevice response schema');

    // 8. Test grantAccess
    const grantedResponse = await realStudentsApi.grantAccess('student-uuid-1', {
      courseId: 'c-1',
      days: 30,
      reason: 'Special access waiver granted',
    });
    assert(capturedMethod === 'POST', 'grantAccess sends POST request');
    assert(
      capturedUrl.includes('/api/v1/identity/students/student-uuid-1/grant-access'),
      'grantAccess calls /identity/students/:id/grant-access',
    );
    assert(studentDetailSchema.safeParse(grantedResponse).success, 'Validated grantAccess response schema');

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runStudentsApiTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
