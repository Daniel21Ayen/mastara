// apps/mobile/src/modules/profile/profileApi.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { realProfileApi, profileApi } from './api/profile.api';
import { httpClient } from '@/core/network';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

test('profile: real API client gets and saves profile', async () => {
  const origGet = httpClient.get;
  const origPut = httpClient.put;
  let getCalls = 0;
  let putCalls = 0;

  (httpClient as any).get = async (path: string) => {
    getCalls += 1;
    if (path === '/profile/me') {
      return {
        id: 'std-1',
        name: 'Abebe Kebede',
        identifier: '0911223344',
        academic: {
          universityId: 'u-aau',
          programId: 'p-eng',
          semesterId: 's-1',
          stream: 'NATURAL',
        },
        courseIds: ['c1', 'c2'],
      };
    }
    return null;
  };

  (httpClient as any).put = async (path: string, body: any) => {
    putCalls += 1;
    return body;
  };

  try {
    const profile = await realProfileApi.getProfile('std-1');
    assert.ok(profile);
    assert.equal(profile.universityId, 'u-aau');
    assert.equal(profile.programId, 'p-eng');
    assert.equal(profile.semesterId, 's-1');
    assert.equal(profile.stream, 'NATURAL');
    assert.deepEqual(profile.courseIds, ['c1', 'c2']);

    const saved = await realProfileApi.saveProfile('std-1', {
      universityId: 'u-aau',
      programId: 'p-eng',
      semesterId: 's-2',
      stream: 'NATURAL',
      courseIds: ['c1', 'c2', 'c3'],
    });
    assert.equal(saved.semesterId, 's-2');
    assert.equal(getCalls, 1);
    assert.equal(putCalls, 2);
  } finally {
    httpClient.get = origGet;
    httpClient.put = origPut;
  }
});

test('profile: LOCAL_ONLY offline account saves profile locally without network calls', async () => {
  const origPut = httpClient.put;
  let putCalls = 0;
  (httpClient as any).put = async () => {
    putCalls += 1;
  };

  try {
    // Setup pending sync indicating LOCAL_ONLY
    await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, {
      userId: 'local-std-1',
      purchased: false,
      profile: null,
    });

    const localProfile = {
      universityId: 'u-aau',
      programId: 'p-eng',
      semesterId: 's-1',
      stream: 'NATURAL' as const,
      courseIds: ['c1'],
    };

    const res = await profileApi.saveProfile('local-std-1', localProfile);
    assert.deepEqual(res, localProfile);
    assert.equal(putCalls, 0, 'No network calls when account is in LOCAL_ONLY state');

    const retrieved = await profileApi.getProfile('local-std-1');
    assert.deepEqual(retrieved, localProfile);
  } finally {
    httpClient.put = origPut;
    await secureStorage.remove(STORAGE_KEYS.pendingRemoteSync);
  }
});
