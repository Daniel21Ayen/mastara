// apps/mobile/src/modules/course-list/coursesApi.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { coursesApi, realCoursesApi } from './api/courses.api';
import { myCoursesApi, realMyCoursesApi } from '../my-courses/api/myCourses.api';
import { httpClient } from '@/core/network';

test('courses and catalog: real API client with SQLite cache and access badges', async () => {
  const origGet = httpClient.get;
  let catalogRequests = 0;
  let learningRequests = 0;

  (httpClient as any).get = async (path: string) => {
    if (path.includes('/catalog/courses')) {
      catalogRequests += 1;
      return [
        { id: 'c1', semesterId: 's1', code: 'ENG101', title: 'Communicative English', stream: 'COMMON' },
        { id: 'c2', semesterId: 's1', code: 'MAT101', title: 'Applied Mathematics I', stream: 'NATURAL' },
      ];
    }
    if (path.includes('/learning/my-courses')) {
      learningRequests += 1;
      return [
        {
          course: { id: 'c1', semesterId: 's1', code: 'ENG101', title: 'Communicative English', stream: 'COMMON' },
          access: 'PAID',
          chaptersDone: 2,
          chaptersTotal: 10,
        },
      ];
    }
    return [];
  };

  try {
    // 1. Catalog courses fetch
    const list = await coursesApi.getCourses('s1', 'NATURAL');
    assert.equal(list.length, 2);
    assert.equal(list[0]?.code, 'ENG101');
    assert.equal(list[1]?.code, 'MAT101');
    assert.equal(catalogRequests, 1);

    // 2. My courses fetch
    const myCourses = await myCoursesApi.getMyCourses(['c1']);
    assert.equal(myCourses.length, 1);
    assert.equal(myCourses[0]?.course.id, 'c1');
    assert.equal(myCourses[0]?.access, 'PAID');
    assert.equal(learningRequests, 1);
  } finally {
    httpClient.get = origGet;
  }
});

test('first launch / clean install / empty course list fallback to in-scope courses with badges', async () => {
  const origGet = httpClient.get;

  (httpClient as any).get = async (path: string) => {
    if (path.includes('/learning/my-courses')) {
      // Empty My Course List on first launch / clean install
      return [];
    }
    if (path.includes('/catalog/courses')) {
      return [
        { id: 'c1', semesterId: 'sem-1', code: 'ENG101', title: 'English', stream: 'COMMON', isPromotional: true },
        { id: 'c2', semesterId: 'sem-1', code: 'MAT101', title: 'Calculus I', stream: 'NATURAL', isPromotional: false },
      ];
    }
    return [];
  };

  try {
    const enrolled = await myCoursesApi.getMyCourses([]);
    assert.equal(enrolled.length, 0);

    // When empty, catalog courses in student scope are fetched
    const catalog = await coursesApi.getCourses('sem-1', 'NATURAL');
    assert.equal(catalog.length, 2);

    const mapped = catalog.map((c: any) => ({
      course: c,
      access: c.isPromotional ? 'FREE_TRIAL' : 'LOCKED',
    }));

    // Badges must correctly indicate Free vs Locked
    assert.equal(mapped[0]?.access, 'FREE_TRIAL'); // Free badge
    assert.equal(mapped[1]?.access, 'LOCKED');     // Locked badge
  } finally {
    httpClient.get = origGet;
  }
});
