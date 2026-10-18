import {
  adminCourseSchema,
  adminProgramSchema,
  adminSemesterSchema,
  adminUniversitySchema,
  courseListResultSchema,
} from '@mastara/contracts';
import { httpClient } from '../src/core/network/httpClient';
import { realCatalogApi } from '../src/modules/catalog/api/catalog.api';

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

async function runCatalogApiTests() {
  console.log('=== Testing realCatalogApi in admin-web ===\n');

  const originalFetch = globalThis.fetch;

  try {
    const mockUniversity = {
      id: 'uni-1',
      name: 'Addis Ababa University',
      shortName: 'AAU',
      logoUrl: 'https://assets.mastara.edu.et/aau.png',
      status: 'PUBLISHED',
      programCount: 4,
    };

    const mockProgram = {
      id: 'prog-1',
      universityId: 'uni-1',
      universityShortName: 'AAU',
      name: 'Pre-Engineering',
      status: 'PUBLISHED',
      courseCount: 12,
    };

    const mockSemester = {
      id: 'sem-1',
      programId: 'prog-1',
      programName: 'Pre-Engineering',
      universityShortName: 'AAU',
      number: 1,
      status: 'PUBLISHED',
      courseCount: 6,
      publishedCourseCount: 6,
    };

    const mockCourse = {
      id: 'course-1',
      semesterId: 'sem-1',
      programId: 'prog-1',
      programName: 'Pre-Engineering',
      universityId: 'uni-1',
      universityShortName: 'AAU',
      semesterNumber: 1,
      code: 'MATH101',
      title: 'Calculus I',
      stream: 'NATURAL',
      promotional: true,
      freeTrialItems: 3,
      status: 'PUBLISHED',
    };

    const mockCourseListResult = {
      items: [mockCourse],
      total: 1,
      page: 1,
      pageCount: 1,
    };

    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedMethod = init?.method || 'GET';
      capturedBody = String(init?.body || '');

      if (capturedUrl.includes('/catalog/admin/courses')) {
        if (capturedMethod === 'POST' || capturedMethod === 'PUT' || capturedMethod === 'DELETE') {
          return new Response(JSON.stringify(mockCourse), {
            status: capturedMethod === 'POST' ? 201 : 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify(mockCourseListResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (capturedUrl.includes('/catalog/admin/universities')) {
        if (capturedMethod === 'POST' || capturedMethod === 'PUT' || capturedMethod === 'DELETE') {
          return new Response(JSON.stringify(mockUniversity), {
            status: capturedMethod === 'POST' ? 201 : 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify([mockUniversity]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (capturedUrl.includes('/catalog/admin/programs')) {
        if (capturedMethod === 'POST' || capturedMethod === 'PUT' || capturedMethod === 'DELETE') {
          return new Response(JSON.stringify(mockProgram), {
            status: capturedMethod === 'POST' ? 201 : 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify([mockProgram]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (capturedUrl.includes('/catalog/admin/semesters')) {
        if (capturedMethod === 'PUT' || capturedMethod === 'DELETE') {
          return new Response(JSON.stringify(mockSemester), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify([mockSemester]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    httpClient.setToken('admin-token-test');

    // 1. Courses API
    const courses = await realCatalogApi.listCourses({ q: 'MATH', page: 1 });
    assert(capturedMethod === 'GET', 'listCourses sends GET');
    assert(capturedUrl.includes('/catalog/admin/courses?q=MATH&page=1'), 'listCourses query param formatted');
    assert(courseListResultSchema.safeParse(courses).success, 'Validated courseListResultSchema');

    const createdCourse = await realCatalogApi.createCourse({
      universityId: 'uni-1',
      semesterId: 'sem-1',
      code: 'MATH101',
      title: 'Calculus I',
      stream: 'NATURAL',
      freeTrialItems: 3,
      status: 'PUBLISHED',
    });
    assert(capturedMethod === 'POST', 'createCourse sends POST');
    assert(adminCourseSchema.safeParse(createdCourse).success, 'Validated adminCourseSchema on create');

    const updatedCourse = await realCatalogApi.updateCourse('course-1', {
      code: 'MATH101',
      title: 'Calculus I',
      stream: 'NATURAL',
      freeTrialItems: 3,
      status: 'PUBLISHED',
    });
    assert(capturedMethod === 'PUT', 'updateCourse sends PUT');
    assert(adminCourseSchema.safeParse(updatedCourse).success, 'Validated adminCourseSchema on update');

    const deletedCourse = await realCatalogApi.deleteCourse('course-1');
    assert(capturedMethod === 'DELETE', 'deleteCourse sends DELETE');
    assert(adminCourseSchema.safeParse(deletedCourse).success, 'Validated adminCourseSchema on delete');

    // 2. Universities API
    const universities = await realCatalogApi.listUniversities();
    assert(capturedMethod === 'GET', 'listUniversities sends GET');
    assert(adminUniversitySchema.safeParse(universities[0]).success, 'Validated adminUniversitySchema');

    const createdUni = await realCatalogApi.createUniversity({
      name: 'Addis Ababa University',
      shortName: 'AAU',
      status: 'PUBLISHED',
    });
    assert(capturedMethod === 'POST', 'createUniversity sends POST');
    assert(adminUniversitySchema.safeParse(createdUni).success, 'Validated createUniversity');

    const updatedUni = await realCatalogApi.updateUniversity('uni-1', {
      name: 'Addis Ababa University',
      shortName: 'AAU',
      status: 'PUBLISHED',
    });
    assert(capturedMethod === 'PUT', 'updateUniversity sends PUT');
    assert(adminUniversitySchema.safeParse(updatedUni).success, 'Validated updateUniversity');

    const deletedUni = await realCatalogApi.deleteUniversity('uni-1');
    assert(capturedMethod === 'DELETE', 'deleteUniversity sends DELETE');
    assert(adminUniversitySchema.safeParse(deletedUni).success, 'Validated deleteUniversity');

    // 3. Programs API
    const programs = await realCatalogApi.listPrograms();
    assert(capturedMethod === 'GET', 'listPrograms sends GET');
    assert(adminProgramSchema.safeParse(programs[0]).success, 'Validated adminProgramSchema');

    const createdProg = await realCatalogApi.createProgram({
      universityId: 'uni-1',
      name: 'Pre-Engineering',
      status: 'PUBLISHED',
    });
    assert(capturedMethod === 'POST', 'createProgram sends POST');
    assert(adminProgramSchema.safeParse(createdProg).success, 'Validated createProgram');

    const updatedProg = await realCatalogApi.updateProgram('prog-1', {
      universityId: 'uni-1',
      name: 'Pre-Engineering',
      status: 'PUBLISHED',
    });
    assert(capturedMethod === 'PUT', 'updateProgram sends PUT');
    assert(adminProgramSchema.safeParse(updatedProg).success, 'Validated updateProgram');

    const deletedProg = await realCatalogApi.deleteProgram('prog-1');
    assert(capturedMethod === 'DELETE', 'deleteProgram sends DELETE');
    assert(adminProgramSchema.safeParse(deletedProg).success, 'Validated deleteProgram');

    // 4. Semesters API
    const semesters = await realCatalogApi.listSemesters();
    assert(capturedMethod === 'GET', 'listSemesters sends GET');
    assert(adminSemesterSchema.safeParse(semesters[0]).success, 'Validated adminSemesterSchema');

    const updatedSem = await realCatalogApi.updateSemester('sem-1', {
      status: 'PUBLISHED',
    });
    assert(capturedMethod === 'PUT', 'updateSemester sends PUT');
    assert(adminSemesterSchema.safeParse(updatedSem).success, 'Validated updateSemester');

    const deletedSem = await realCatalogApi.deleteSemester('sem-1');
    assert(capturedMethod === 'DELETE', 'deleteSemester sends DELETE');
    assert(adminSemesterSchema.safeParse(deletedSem).success, 'Validated deleteSemester');

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runCatalogApiTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
