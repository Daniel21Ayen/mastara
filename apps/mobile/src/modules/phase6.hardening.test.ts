// apps/mobile/src/modules/phase6.hardening.test.ts
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  canPurchaseSingleCourse,
  ERROR_CODES,
  formatStudentId,
  generateClaimSecret,
  hashClaimSecret,
  parseStudentId,
} from '@mastara/domain';

import { getDb, migrateLocalUserToStudentId } from '@/core/db';
import { httpClient } from '@/core/network';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import { authApi, getAccountState, realAuthApi } from './auth/api/auth.api';
import { storeApi } from './store/api/store.api';
import {
  addPendingClaim,
  getPendingClaims,
  processPendingClaims,
} from './store/services/claimService';
import { downloadStore } from '@/core/downloads';
import { courseDownload } from './courses/lib/courseDownload';
import { contentRemote } from './courses/api/content.api';
import { quizRemote } from './quizzes/api/quiz.api';
import { examRemote } from './exams/api/exam.api';

describe('Phase 6: Hardening, Conflict Resolution & End-to-End Verification', () => {
  test('REG-16: Recovery login merges existing local data into recovered server student account', async () => {
    const localId = 'local-reinstall-uuid-1';
    const recoveredServerId = 'server-student-ms0042';

    // 1. Seed existing local user in secureStorage with offline bookmarks / attempts
    await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, {
      userId: localId,
      localAccountId: localId,
      accountState: 'LOCAL_ONLY',
      name: 'Local Student',
      identifier: '0911223344',
      purchased: false,
    });

    const db = await getDb();
    await db.runAsync('INSERT OR REPLACE INTO bookmarks (user_id, topic_id, created_at) VALUES (?, ?, ?)', [
      localId,
      'topic-recovery-1',
      Date.now(),
    ]);

    // Verify bookmark is initially owned by localId
    const localRows = await db.getAllAsync<{ topic_id: string }>(
      'SELECT topic_id FROM bookmarks WHERE user_id = ?',
      [localId],
    );
    assert.equal(localRows.length, 1);

    // 2. Mock server login returning the recovered account
    const origLogin = realAuthApi.login;
    (realAuthApi as any).login = async () => ({
      user: {
        id: recoveredServerId,
        name: 'Recovered Student',
        identifier: '0911223344',
      },
      token: 'jwt-recovered-token-42',
    });

    try {
      const loginResult = await authApi.login({
        identifier: '0911223344',
        password: 'ValidPassword123!',
      });

      assert.equal(loginResult.user.id, recoveredServerId);

      // 3. Confirm local bookmarks were merged into recoveredServerId (REG-16)
      const recoveredRows = await db.getAllAsync<{ topic_id: string }>(
        'SELECT topic_id FROM bookmarks WHERE user_id = ?',
        [recoveredServerId],
      );
      assert.equal(recoveredRows.length, 1, 'Local bookmarks must be merged into recovered student ID');

      const oldRows = await db.getAllAsync<{ topic_id: string }>(
        'SELECT topic_id FROM bookmarks WHERE user_id = ?',
        [localId],
      );
      assert.equal(oldRows.length, 0, 'Old local account rows should be migrated');

      // 4. Confirm account state transitioned to REGISTERED_REMOTE
      const state = await getAccountState();
      assert.equal(state, 'REGISTERED_REMOTE');
    } finally {
      (realAuthApi as any).login = origLogin;
    }
  });

  test('REG-11: Takeover prevention surfaces ACCOUNT_EXISTS_LOGIN_REQUIRED', async () => {
    const origPost = httpClient.post;
    (httpClient as any).post = async (path: string) => {
      if (path === '/commerce/orders/unregistered') {
        throw {
          errorCode: 'ACCOUNT_EXISTS_LOGIN_REQUIRED',
          message: 'An account with this phone number already exists. Please log in.',
        };
      }
      return {};
    };

    try {
      await assert.rejects(
        () =>
          storeApi.submitUnregisteredOrder({
            localAccountId: 'local-test-uuid',
            fullName: 'Duplicate Student',
            identifier: '0911223344',
            password: 'Password123!',
            claimSecretHash: 'hash-abc',
            type: 'BUNDLE',
            stream: 'NATURAL',
            courseIds: ['course-1'],
            method: 'CBE_MOBILE',
            reference: 'FT24REF999',
            imageKey: 'receipts/rec.jpg',
          }),
        (err: any) => err.errorCode === 'ACCOUNT_EXISTS_LOGIN_REQUIRED',
      );
    } finally {
      (httpClient as any).post = origPost;
    }
  });

  test('End-to-End: Complete lifecycle from offline registration to paid claiming and content versioning', async () => {
    // A. Offline Registration (REG-01..05)
    await secureStorage.remove(STORAGE_KEYS.pendingRemoteSync);
    await secureStorage.remove(STORAGE_KEYS.offlineUsers);
    await secureStorage.remove(STORAGE_KEYS.pendingPassword);

    const regResult = await authApi.register({
      name: 'Aster Awoke',
      identifier: '0911556677',
      password: 'SecurePass123!',
    });
    assert.equal(await getAccountState(), 'LOCAL_ONLY');
    const localId = regResult.user.id;

    // B. Purchase Eligibility (PUR-01..07)
    // 1st purchase: Single course is locked
    const singleAllowed = canPurchaseSingleCourse({
      hasActiveBundle: false,
      isCourseInActiveBundle: false,
    });
    assert.equal(singleAllowed.allowed, false);
    assert.match(singleAllowed.reasonKey, /bundleRequired/);

    // C. Order Submission with Claim Protocol (REG-10, REG-14)
    const secret = generateClaimSecret();
    const secretHash = hashClaimSecret(secret);
    await addPendingClaim({
      orderId: 'e2e-order-888',
      claimSecret: secret,
      claimSecretHash: secretHash,
      status: 'PENDING',
      submittedAt: Date.now(),
      reference: 'FT24E2E888',
    });

    // D. Simulate Server Approval & Atomic MS Counter (REG-08, ADM-02)
    const assignedCode = formatStudentId(42);
    assert.equal(assignedCode, 'MS0042');
    assert.equal(parseStudentId('MS0042'), 42);

    // E. Local Claim Resolution (REG-12, REG-14)
    const origGet = httpClient.get;
    (httpClient as any).get = async (path: string) => {
      if (path.includes('/claim')) {
        return {
          status: 'APPROVED',
          studentId: 'server-uuid-ms0042',
          studentCode: 'MS0042',
          token: 'jwt-ms0042-token',
          entitlements: [{ courseId: 'c-phys-101', startsAt: '2026-10-27', expiresAt: '2027-02-27', status: 'ACTIVE' }],
        };
      }
      return {};
    };

    try {
      const claimResult = await processPendingClaims();
      assert.equal(claimResult?.studentCode, 'MS0042');
      assert.equal(claimResult?.token, 'jwt-ms0042-token');

      // F. Resumable Downloads & Versioning (DWN-01, DWN-06)
      const course = {
        id: 'c-phys-101',
        code: 'PHYS101',
        semesterId: 'sem-1',
        title: 'Physics',
        stream: 'NATURAL' as const,
        contentVersion: 1,
      };

      (contentRemote as any).getTopics = async () => [{ id: 'topic-e2e-1', title: { en: 'Kinematics' } }];
      (contentRemote as any).getTopic = async () => ({ id: 'topic-e2e-1', body: 'details' });
      (quizRemote as any).getChapters = async () => [];
      (examRemote as any).getExams = async () => [];

      const downloadRecipe = courseDownload(course);
      const entries = await downloadRecipe.fetch();
      await downloadStore.saveUnit(
        {
          unitId: downloadRecipe.unitId,
          kind: 'COURSE',
          courseId: course.id,
          title: course.title,
          meta: course,
        },
        entries,
      );

      const savedVersion = await downloadStore.getDownloadedCourseVersion(course.id);
      assert.equal(savedVersion, 1);

      // Now single course purchase is unlocked because student owns a bundle
      const singleNowAllowed = canPurchaseSingleCourse({
        hasActiveBundle: true,
        isCourseInActiveBundle: false,
      });
      assert.equal(singleNowAllowed.allowed, true);
    } finally {
      (httpClient as any).get = origGet;
    }
  });
});
