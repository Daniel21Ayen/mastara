// apps/mobile/src/modules/profile/academicApi.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { academicApi, realAcademicApi } from './api/academic.api';
import { httpClient } from '@/core/network';

test('academic scope: real API client with SQLite cache', async () => {
  const origGet = httpClient.get;
  let networkCalls = 0;

  (httpClient as any).get = async (path: string) => {
    networkCalls += 1;
    if (path === '/catalog/universities') {
      return [
        { id: 'u1', name: 'Addis Ababa University', shortName: 'AAU' },
        { id: 'u2', name: 'Bahir Dar University', shortName: 'BDU' },
      ];
    }
    if (path.includes('/programs')) {
      return [{ id: 'p1', universityId: 'u1', name: 'Natural Science' }];
    }
    if (path.includes('/semesters')) {
      return [{ id: 's1', programId: 'p1', number: 1 }];
    }
    return [];
  };

  try {
    const universities = await academicApi.getUniversities();
    assert.equal(universities.length, 2);
    assert.equal(universities[0]?.shortName, 'AAU');
    assert.equal(networkCalls, 1);

    const programs = await academicApi.getPrograms('u1');
    assert.equal(programs.length, 1);
    assert.equal(programs[0]?.name, 'Natural Science');

    const semesters = await academicApi.getSemesters('p1');
    assert.equal(semesters.length, 1);
    assert.equal(semesters[0]?.number, 1);
  } finally {
    httpClient.get = origGet;
  }
});
