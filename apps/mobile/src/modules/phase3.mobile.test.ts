// apps/mobile/src/modules/phase3.mobile.test.ts
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  canPurchaseSingleCourse,
  generateClaimSecret,
  hashClaimSecret,
  isBundleProductType,
} from '@mastara/domain';
import { translate } from '@mastara/i18n';

import { getDb, migrateLocalUserToStudentId } from '@/core/db';
import { httpClient } from '@/core/network';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import { authApi, getAccountState } from './auth/api/auth.api';
import { storeApi } from './store/api/store.api';
import {
  addPendingClaim,
  getPendingClaims,
  processPendingClaims,
} from './store/services/claimService';

describe('Phase 3: Mobile Offline Registration, Store Eligibility, Claim & Local Migration', () => {
  test('REG-01..05: Offline registration creates local-only UUID account without network calls', async () => {
    await secureStorage.remove(STORAGE_KEYS.pendingRemoteSync);
    await secureStorage.remove(STORAGE_KEYS.offlineUsers);
    await secureStorage.remove(STORAGE_KEYS.pendingPassword);

    const networkCalls: string[] = [];
    const origPost = httpClient.post;
    (httpClient as any).post = async (path: string) => {
      networkCalls.push(path);
      return {};
    };

    try {
      const result = await authApi.register({
        name: 'Dawit Tsige',
        identifier: '0912345678',
        password: 'Password123!',
      });

      // 1. Zero network calls (REG-02)
      assert.equal(networkCalls.length, 0, 'No network requests on registration');

      // 2. User ID and localAccountId is a valid RFC4122 UUID v4 (REG-03)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      assert.match(result.user.id, uuidRegex, 'Local account ID must be a random UUID v4');

      // 3. Account state is LOCAL_ONLY (REG-04)
      const state = await getAccountState();
      assert.equal(state, 'LOCAL_ONLY');

      // 4. Stored pending password available for checkout submission (REG-16)
      const savedPass = await secureStorage.getString(STORAGE_KEYS.pendingPassword);
      assert.equal(savedPass, 'Password123!');

      // 5. Registration disclaimer text exists in both languages (REG-05)
      const enNotice = translate('en', 'auth.localNotice');
      assert.ok(enNotice.includes('saved on this phone until you purchase a bundle'));
      const amNotice = translate('am', 'auth.localNotice');
      assert.ok(amNotice.length > 0);
    } finally {
      httpClient.post = origPost;
    }
  });

  test('PUR-01..07: Purchase eligibility pure domain functions enforce bundles and single courses', () => {
    // PUR-01: Bundles qualification
    assert.equal(isBundleProductType('BUNDLE'), true);
    assert.equal(isBundleProductType('FULL_STREAM'), true);
    assert.equal(isBundleProductType('FULL_BOTH'), true);
    assert.equal(isBundleProductType('SINGLE'), false);

    // PUR-03, PUR-06: Unregistered / student without bundle cannot buy single course
    const noBundleResult = canPurchaseSingleCourse({
      hasActiveBundle: false,
      isCourseInBundle: false,
      singleCoursesEnabled: true,
    });
    assert.equal(noBundleResult.allowed, false);
    assert.equal(noBundleResult.reason, 'BUNDLE_REQUIRED');
    assert.ok(noBundleResult.message?.includes('Buy a semester or full bundle first'));

    // Translation key for PUR-06 matches exact requirement text
    const lockText = translate('en', 'store.singleLocked');
    assert.equal(lockText, 'Buy a semester or full bundle first to unlock single courses');

    // PUR-07: Course already in student active bundle cannot be bought separately
    const inBundleResult = canPurchaseSingleCourse({
      hasActiveBundle: true,
      isCourseInBundle: true,
      singleCoursesEnabled: true,
    });
    assert.equal(inBundleResult.allowed, false);
    assert.equal(inBundleResult.reason, 'ALREADY_IN_BUNDLE');

    // PUR-02: Student with active bundle can buy extra single course
    const eligibleResult = canPurchaseSingleCourse({
      hasActiveBundle: true,
      isCourseInBundle: false,
      singleCoursesEnabled: true,
    });
    assert.equal(eligibleResult.allowed, true);
  });

  test('REG-10, REG-14: Claim secret generation, hashing and local queue management', async () => {
    await secureStorage.remove(STORAGE_KEYS.pendingClaims);

    // 1. Generate 256-bit random claim secret (64 hex characters)
    const secret = generateClaimSecret();
    assert.equal(secret.length, 64);
    assert.match(secret, /^[0-9a-f]{64}$/i);

    // 2. Hash secret with SHA-256
    const hash = hashClaimSecret(secret);
    assert.equal(hash.length, 64);
    assert.notEqual(hash, secret);

    // 3. Add to pending claims
    const orderId = 'a0000000-0000-4000-8000-000000000001';
    await addPendingClaim({
      orderId,
      reference: 'CBE-TX-100234',
      claimSecret: secret,
      localAccountId: 'b0000000-0000-4000-8000-000000000001',
      submittedAt: Date.now(),
    });

    const pending = await getPendingClaims();
    assert.equal(pending.length, 1);
    assert.equal(pending[0].orderId, orderId);
    assert.equal(pending[0].status, 'PENDING');
  });

  test('REG-12: SQLite user migration replaces local UUID with assigned MS0001+ across all tables', async () => {
    const db = await getDb();
    const oldLocalId = 'c0000000-0000-4000-8000-000000000001';
    const newStudentCode = 'MS0001';

    // Seed test data belonging to oldLocalId
    await db.runAsync(
      'INSERT OR REPLACE INTO quiz_results (user_id, chapter_id, correct, total, finished_at) VALUES (?, ?, ?, ?, ?);',
      oldLocalId,
      'ch-101',
      5,
      5,
      new Date().toISOString(),
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO exam_results (id, user_id, title, correct, total, submitted_at) VALUES (?, ?, ?, ?, ?, ?);',
      'exam-res-1',
      oldLocalId,
      'Midterm Exam',
      18,
      20,
      new Date().toISOString(),
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO attempts (user_id, key, state, updated_at) VALUES (?, ?, ?, ?);',
      oldLocalId,
      'q-1',
      'PASSED',
      Date.now(),
    );
    await db.runAsync(
      'INSERT OR REPLACE INTO outbox (id, user_id, type, payload, created_at, attempts) VALUES (?, ?, ?, ?, ?, ?);',
      'out-1',
      oldLocalId,
      'SYNC_PROGRESS',
      '{}',
      new Date().toISOString(),
      0,
    );

    // Run migration
    await migrateLocalUserToStudentId(oldLocalId, newStudentCode);

    // Verify all rows now belong to MS0001
    const quizRow = await db.getFirstAsync<any>(
      'SELECT user_id FROM quiz_results WHERE chapter_id = ?;',
      'ch-101',
    );
    assert.equal(quizRow?.user_id, 'MS0001');

    const examRow = await db.getFirstAsync<any>(
      'SELECT user_id FROM exam_results WHERE id = ?;',
      'exam-res-1',
    );
    assert.equal(examRow?.user_id, 'MS0001');

    const attemptRow = await db.getFirstAsync<any>(
      'SELECT user_id FROM attempts WHERE key = ?;',
      'q-1',
    );
    assert.equal(attemptRow?.user_id, 'MS0001');

    const outboxRow = await db.getFirstAsync<any>(
      'SELECT user_id FROM outbox WHERE id = ?;',
      'out-1',
    );
    assert.equal(outboxRow?.user_id, 'MS0001');

    // Verify old local ID no longer exists in any table
    const remainingOld = await db.getFirstAsync<any>(
      'SELECT user_id FROM quiz_results WHERE user_id = ?;',
      oldLocalId,
    );
    assert.equal(remainingOld, null, 'Old local UUID must be completely migrated');
  });

  test('REG-12, REG-14: processPendingClaims completes claim upon approval, updates token and session', async () => {
    const localId = 'd0000000-0000-4000-8000-000000000001';
    const orderId = 'd0000000-0000-4000-8000-000000000002';
    const claimSecret = generateClaimSecret();

    // Setup local state
    await secureStorage.setJson(STORAGE_KEYS.session, {
      user: { id: localId, name: 'Tigist Alemu', identifier: '0922334455' },
      device: 'bound',
      profile: null,
    });
    await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, {
      userId: localId,
      localAccountId: localId,
      accountState: 'LOCAL_ONLY',
      name: 'Tigist Alemu',
      identifier: '0922334455',
      purchased: false,
    });
    await secureStorage.setJson(STORAGE_KEYS.pendingClaims, [
      {
        orderId,
        reference: 'CBE-TX-999',
        claimSecret,
        localAccountId: localId,
        submittedAt: Date.now(),
        status: 'PENDING',
      },
    ]);

    // Mock claim API endpoint response
    const origClaim = storeApi.claimOrder;
    (storeApi as any).claimOrder = async (oId: string, secret: string) => {
      assert.equal(oId, orderId);
      assert.equal(secret, claimSecret);
      return {
        studentId: 'e0000000-0000-4000-8000-000000000001',
        studentCode: 'MS0002',
        token: 'claimed-jwt-token-xyz',
        refreshToken: 'claimed-refresh-token-xyz',
      };
    };

    try {
      const result = await processPendingClaims();
      assert.equal(result.claimed.length, 1);
      assert.equal(result.claimed[0].studentCode, 'MS0002');
      assert.equal(result.pendingCount, 0);

      // Verify session updated to MS0002
      const updatedSession = await secureStorage.getJson<any>(STORAGE_KEYS.session);
      assert.equal(updatedSession?.user?.id, 'MS0002');

      // Verify pending claims status updated
      const claims = await getPendingClaims();
      assert.equal(claims[0].status, 'CLAIMED');
      assert.equal(claims[0].studentCode, 'MS0002');

      // Verify pendingRemoteSync state transitioned to REGISTERED_REMOTE
      const pendingSync = await secureStorage.getJson<any>(STORAGE_KEYS.pendingRemoteSync);
      assert.equal(pendingSync?.accountState, 'REGISTERED_REMOTE');
      assert.equal(pendingSync?.purchased, true);
    } finally {
      storeApi.claimOrder = origClaim;
    }
  });
});
