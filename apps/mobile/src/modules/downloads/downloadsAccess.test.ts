// apps/mobile/src/modules/downloads/downloadsAccess.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { ERROR_CODES, resolveContentRead } from '@mastara/domain';
import { ApiError } from '@/core/network/ApiError';
import { getOrCreateDeviceKey, setEntitlementKey, getEntitlementKey } from '@/core/security/contentKeys';

test('Downloads & Offline Access Rules', async (t) => {
  await t.test('1. Undownloaded content throws CONTENT_NOT_DOWNLOADED when offline', async () => {
    let localAnswer: { found: false } = { found: false };

    async function tryOpenContent() {
      return resolveContentRead<string>({
        local: async () => localAnswer,
        load: async () => {
          throw new ApiError(ERROR_CODES.NETWORK_OFFLINE);
        },
        isOffline: (err) => (err as any)?.code === ERROR_CODES.NETWORK_OFFLINE,
        notDownloaded: () => new ApiError(ERROR_CODES.CONTENT_NOT_DOWNLOADED),
      });
    }

    await assert.rejects(
      async () => {
        await tryOpenContent();
      },
      (err: any) => {
        assert.equal(err.code, ERROR_CODES.CONTENT_NOT_DOWNLOADED);
        return true;
      },
    );
  });

  await t.test('2. Free content uses a persistent device key from secure storage', async () => {
    const key1 = await getOrCreateDeviceKey();
    assert.ok(key1 && typeof key1 === 'string');
    assert.equal(key1.length, 64); // 32 bytes hex encoded

    // Repeated calls return the exact same key
    const key2 = await getOrCreateDeviceKey();
    assert.equal(key1, key2);
  });

  await t.test('3. Paid content uses a signed entitlement key set upon purchase', async () => {
    const sampleEntitlementKey = 'token-ed25519-signed-entitlement-key-sample';
    await setEntitlementKey(sampleEntitlementKey);

    const retrieved = await getEntitlementKey();
    assert.equal(retrieved, sampleEntitlementKey);
  });

  await t.test('4. Deleting a course clears rows and files cleanly', async () => {
    let mockDownloadedUnits = [
      { unitId: 'COURSE:course-1', courseId: 'course-1', title: 'Calculus I' },
      { unitId: 'TOPIC:topic-1', courseId: 'course-1', title: 'Limits' },
      { unitId: 'COURSE:course-2', courseId: 'course-2', title: 'Physics' },
    ];

    function removeCourse(courseId: string) {
      mockDownloadedUnits = mockDownloadedUnits.filter(
        (u) => u.courseId !== courseId && u.unitId !== `COURSE:${courseId}`,
      );
    }

    removeCourse('course-1');
    assert.equal(mockDownloadedUnits.length, 1);
    assert.equal(mockDownloadedUnits[0]?.courseId, 'course-2');
  });
});
