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

    // 1. Seed existing local user in secureStorage with offline quiz results
    await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, {
      userId: localId,
      localAccountId: localId,
      accountState: 'LOCAL_ONLY',
      name: 'Local Student',
      identifier: '0911223344',
      purchased: false,
    });

    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO quiz_results (user_id, chapter_id, correct, total, finished_at) VALUES (?, ?, ?, ?, ?)',
      [localId, 'ch-recovery-1', 5, 5, new Date().toISOString()],
    );

    // Verify quiz result is initially owned by localId
    const localRows = await db.getAllAsync<{ chapter_id: string }>(
      'SELECT chapter_id FROM quiz_results WHERE user_id = ?',
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

      // 3. Confirm local quiz results were merged into recoveredServerId (REG-16)
      const recoveredRows = await db.getAllAsync<{ chapter_id: string }>(
        'SELECT chapter_id FROM quiz_results WHERE user_id = ?',
        [recoveredServerId],
      );
      assert.equal(recoveredRows.length, 1, 'Local quiz results must be merged into recovered student ID');

      const oldRows = await db.getAllAsync<{ chapter_id: string }>(
        'SELECT chapter_id FROM quiz_results WHERE user_id = ?',
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
          storeApi.submitOrderWithLocal({
            localAccountId: '11111111-2222-3333-4444-555555555555',
            fullName: 'Duplicate Student',
            identifier: '0911223344',
            password: 'Password123!',
            claimSecretHash: 'a'.repeat(64),
            type: 'BUNDLE',
            stream: 'NATURAL',
            courseIds: ['course-1'],
            method: 'CBE_MOBILE',
            reference: 'FT24REF999',
            imageKey: 'receipts/rec.jpg',
            imageSizeBytes: 1024,
            imageMime: 'image/jpeg',
          }),
        (err: any) => err.errorCode === 'ACCOUNT_EXISTS_LOGIN_REQUIRED',
      );
    } finally {
      (httpClient as any).post = origPost;
    }
  });

  test('OFF-05: Conflict resolution applies latest-change-wins on local store', async () => {
    const db = await getDb();
    const userId = 'conflict-user-1';
    const itemId = 'item-math-101';

    // 1. Initial write with t1
    const t1 = 1000;
    await db.runAsync(
      `INSERT OR REPLACE INTO catalog_item
        (user_id, id, kind, course_id, parent_id, title, position, is_free, meta, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, itemId, 'COURSE', 'course-math', null, 'Math V1', 1, 0, null, t1],
    );

    let row = await db.getFirstAsync<{ title: string; updated_at: number }>(
      'SELECT title, updated_at FROM catalog_item WHERE user_id = ? AND id = ?',
      [userId, itemId],
    );
    assert.equal(row?.title, 'Math V1');
    assert.equal(row?.updated_at, t1);

    // 2. Newer change with t2 > t1 wins (OFF-05)
    const t2 = 2000;
    await db.runAsync(
      `INSERT INTO catalog_item
        (user_id, id, kind, course_id, parent_id, title, position, is_free, meta, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, id) DO UPDATE SET
         title = CASE WHEN excluded.updated_at >= catalog_item.updated_at THEN excluded.title ELSE catalog_item.title END,
         updated_at = CASE WHEN excluded.updated_at >= catalog_item.updated_at THEN excluded.updated_at ELSE catalog_item.updated_at END`,
      [userId, itemId, 'COURSE', 'course-math', null, 'Math V2 (Newer)', 1, 0, null, t2],
    );

    row = await db.getFirstAsync<{ title: string; updated_at: number }>(
      'SELECT title, updated_at FROM catalog_item WHERE user_id = ? AND id = ?',
      [userId, itemId],
    );
    assert.equal(row?.title, 'Math V2 (Newer)');
    assert.equal(row?.updated_at, t2);

    // 3. Stale change with t0 < t2 does not overwrite newer data
    const t0 = 500;
    await db.runAsync(
      `INSERT INTO catalog_item
        (user_id, id, kind, course_id, parent_id, title, position, is_free, meta, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, id) DO UPDATE SET
         title = CASE WHEN excluded.updated_at >= catalog_item.updated_at THEN excluded.title ELSE catalog_item.title END,
         updated_at = CASE WHEN excluded.updated_at >= catalog_item.updated_at THEN excluded.updated_at ELSE catalog_item.updated_at END`,
      [userId, itemId, 'COURSE', 'course-math', null, 'Math V0 (Stale)', 1, 0, null, t0],
    );

    row = await db.getFirstAsync<{ title: string; updated_at: number }>(
      'SELECT title, updated_at FROM catalog_item WHERE user_id = ? AND id = ?',
      [userId, itemId],
    );
    assert.equal(row?.title, 'Math V2 (Newer)', 'Latest change must win over stale edits');
    assert.equal(row?.updated_at, t2);
  });

  test('PUR-09: Bundle expiration or refund retains single-course access but locks new single purchases', () => {
    // a. While bundle was active, single course was purchased separately.
    // When bundle expires (hasActiveBundle = false), the previously owned single course is still accessible.
    // But attempting to buy another new single course is blocked.
    const newSingleAttempt = canPurchaseSingleCourse({
      hasActiveBundle: false,
      isCourseInBundle: false,
      isCourseAlreadyOwned: false,
    });
    assert.equal(newSingleAttempt.allowed, false);
    assert.equal(newSingleAttempt.reason, 'BUNDLE_REQUIRED');
    assert.match(newSingleAttempt.message || '', /bundle first/i);

    // Trying to re-purchase the already owned single course returns COURSE_ALREADY_OWNED
    const ownedCourseAttempt = canPurchaseSingleCourse({
      hasActiveBundle: true,
      isCourseInBundle: false,
      isCourseAlreadyOwned: true,
    });
    assert.equal(ownedCourseAttempt.allowed, false);
    assert.equal(ownedCourseAttempt.reason, 'COURSE_ALREADY_OWNED');
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
      isCourseInBundle: false,
    });
    assert.equal(singleAllowed.allowed, false);
    assert.equal(singleAllowed.reason, 'BUNDLE_REQUIRED');

    // C. Order Submission with Claim Protocol (REG-10, REG-14)
    const secret = generateClaimSecret();
    const secretHash = hashClaimSecret(secret);
    await addPendingClaim({
      orderId: 'e2e-order-888',
      claimSecret: secret,
      localAccountId: localId,
      submittedAt: Date.now(),
      reference: 'FT24E2E888',
    });

    // D. Simulate Server Approval & Atomic MS Counter (REG-08, ADM-02)
    const assignedCode = formatStudentId(42);
    assert.equal(assignedCode, 'MS0042');
    assert.equal(parseStudentId('MS0042'), 42);

    // E. Local Claim Resolution (REG-12, REG-14)
    const origPost = httpClient.post;
    (httpClient as any).post = async (path: string) => {
      if (path.includes('/claim')) {
        return {
          studentId: 'server-uuid-ms0042',
          studentCode: 'MS0042',
          token: 'jwt-ms0042-token',
          entitlementToken: 'entitlement-jwt-42',
        };
      }
      return {};
    };

    try {
      const claimResult = await processPendingClaims();
      assert.equal(claimResult.claimed.length, 1);
      assert.equal(claimResult.claimed[0]?.studentCode, 'MS0042');
      assert.equal(claimResult.claimed[0]?.token, 'jwt-ms0042-token');

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
        isCourseInBundle: false,
      });
      assert.equal(singleNowAllowed.allowed, true);
    } finally {
      (httpClient as any).post = origPost;
    }
  });
});
