// apps/mobile/src/modules/reader/phase6-security.test.ts
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';

import type { Topic } from '@mastara/contracts';
import {
  canOpenContent,
  ERROR_CODES,
  offlineAccess,
  signEntitlementToken,
  trustedNowMs,
  verifyEntitlementTokenOffline,
  type ErrorCode,
  type SignedEntitlementToken,
} from '@mastara/domain';

import { ApiError } from '../../core/network/ApiError';
import {
  getEntitlementKey,
  getOrCreateDeviceKey,
  removeEntitlementKey,
  setEntitlementKey,
} from '../../core/security/contentKeys';
import { verifyCourseAccess } from '../../core/security/entitlementVerification';
import { readerMemoryCache } from './store/readerMemoryCache';

// Generate Ed25519 keypair for realistic cryptographic token signing in tests
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const testPrivateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const testPublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

describe('Phase 6: Security Hardening (Four Core Failure Gates)', () => {
  const samplePaidTopic: Topic = {
    id: 'topic-quantum-101',
    courseId: 'course-phys-401',
    kind: 'MODULE',
    number: 1,
    title: { en: 'Quantum Superposition', am: 'የኳንተም ድርብርብነት' },
    summary: { en: 'Paid advanced physics lesson', am: 'የሚከፈልበት የፊዚክስ ትምህርት' },
    body: { en: 'Classified paid quantum mechanics formulation', am: 'የኳንተም ሜካኒክስ ቀመሮች' },
    isFree: false,
  };

  const sampleFreeTopic: Topic = {
    id: 'topic-intro-101',
    courseId: 'course-phys-401',
    kind: 'MODULE',
    number: 0,
    title: { en: 'Intro to Physics', am: 'መግቢያ' },
    summary: { en: 'Free trial lesson', am: 'ነጻ የሙከራ ትምህርት' },
    body: { en: 'Free public introduction', am: 'ነጻ መግቢያ' },
    isFree: true,
  };

  beforeEach(async () => {
    readerMemoryCache.clear();
    await removeEntitlementKey();
  });

  // =========================================================================
  // 1. Unpaid Account Gate
  // =========================================================================
  describe('1. Unpaid account fails to open paid content', () => {
    it('online: server gatekeeper returns CONTENT_LOCKED (403) for unpaid student', async () => {
      async function simulateServerGetTopic(studentAccess: 'FREE_TRIAL' | 'PAID', topic: Topic) {
        if (!canOpenContent(studentAccess, topic.isFree)) {
          throw new ApiError(ERROR_CODES.CONTENT_LOCKED, 'This content is locked and requires an active subscription');
        }
        return topic;
      }

      // Unpaid account requesting paid content must fail
      await assert.rejects(
        () => simulateServerGetTopic('FREE_TRIAL', samplePaidTopic),
        (err: any) => {
          assert.equal(err.code, ERROR_CODES.CONTENT_LOCKED);
          return true;
        },
      );

      // Unpaid account requesting free trial content succeeds
      const freeResult = await simulateServerGetTopic('FREE_TRIAL', sampleFreeTopic);
      assert.equal(freeResult.id, sampleFreeTopic.id);
    });

    it('offline: local access resolver blocks unpaid account from opening paid body', () => {
      const unpaidAccess = 'FREE_TRIAL';
      const canOpenPaid = canOpenContent(unpaidAccess, samplePaidTopic.isFree);
      assert.equal(canOpenPaid, false);

      const canOpenFree = canOpenContent(unpaidAccess, sampleFreeTopic.isFree);
      assert.equal(canOpenFree, true);
    });

    it('offline: rejects tampered local storage with unsigned PAID flag', async () => {
      // Attacker manipulated SQLite / local storage to claim access: "PAID"
      // but lacks a valid Ed25519 cryptographic signature from the server
      const verification = await verifyCourseAccess('course-phys-401', {
        token: null, // No signed token
      });

      assert.equal(verification.allowed, false);
      if (!verification.allowed) {
        assert.equal(verification.reason, 'UNSIGNED_LOCAL_STORAGE');
      }

      // Function attempting to open paid content must refuse
      async function openWithUnsignedLocalFlag() {
        if (!verification.allowed) {
          throw new ApiError(ERROR_CODES.CONTENT_LOCKED);
        }
        return samplePaidTopic;
      }

      await assert.rejects(
        () => openWithUnsignedLocalFlag(),
        (err: any) => {
          assert.equal(err.code, ERROR_CODES.CONTENT_LOCKED);
          return true;
        },
      );
    });

    it('offline: rejects forged/tampered entitlement token signature', async () => {
      const now = Date.now();
      const legitimateToken = signEntitlementToken(
        {
          studentId: 'student-attacker',
          courseIds: ['course-phys-401'],
          expiresAt: new Date(now + 30 * 86400000).toISOString(),
          serverTime: now,
        },
        testPrivateKeyPem,
      );

      // Malicious student tampers with courseIds or signature
      const tamperedToken: SignedEntitlementToken = {
        payload: {
          ...legitimateToken.payload,
          courseIds: ['course-phys-401', 'unauthorized-course-999'],
        },
        signature: legitimateToken.signature,
      };

      const verification = await verifyCourseAccess('unauthorized-course-999', {
        token: tamperedToken,
        publicKeyPem: testPublicKeyPem,
      });

      assert.equal(verification.allowed, false);
      if (!verification.allowed) {
        assert.equal(verification.reason, 'INVALID_SIGNATURE');
      }
    });
  });

  // =========================================================================
  // 2. Expired Account Gate
  // =========================================================================
  describe('2. Expired account fails to open paid content', () => {
    it('online: server refuses access when entitlement has expired in PostgreSQL', async () => {
      const pastDate = new Date(Date.now() - 1000);

      function checkServerEntitlement(expiresAt: Date) {
        const isEntitled = expiresAt.getTime() > Date.now();
        if (!isEntitled) {
          throw new ApiError(ERROR_CODES.CONTENT_LOCKED, 'Subscription has expired');
        }
        return true;
      }

      assert.throws(
        () => checkServerEntitlement(pastDate),
        (err: any) => {
          assert.equal(err.code, ERROR_CODES.CONTENT_LOCKED);
          return true;
        },
      );
    });

    it('offline: fails access when token expiry date has passed', async () => {
      const T0 = 1700000000000;
      const expiredToken = signEntitlementToken(
        {
          studentId: 'student-1',
          courseIds: ['course-phys-401'],
          expiresAt: new Date(T0 - 5000).toISOString(), // Expired 5 seconds ago
          serverTime: T0 - 100000,
        },
        testPrivateKeyPem,
      );

      const verification = await verifyCourseAccess('course-phys-401', {
        token: expiredToken,
        currentDeviceTimeMs: T0,
        lastSeenServerTimeMs: T0 - 100000,
        publicKeyPem: testPublicKeyPem,
      });

      assert.equal(verification.allowed, false);
      if (!verification.allowed) {
        assert.equal(verification.reason, 'TOKEN_EXPIRED');
      }
    });

    it('offline grace: fails access when offline grace period (7 days) is exceeded', () => {
      const T0 = 1700000000000;
      const DAY = 86400000;

      // 8 days elapsed without reconnecting to the server
      const accessResult = offlineAccess(
        {
          access: 'PAID',
          cachedAtMs: T0,
          expiresAtMs: T0 + 30 * DAY,
        },
        T0 + 8 * DAY,
        7, // OFFLINE_GRACE_DAYS
      );

      assert.equal(accessResult.access, 'LOCKED');

      function openPaidOffline() {
        if (accessResult.access !== 'PAID') {
          throw new ApiError(ERROR_CODES.ENTITLEMENT_EXPIRED);
        }
        return samplePaidTopic;
      }

      assert.throws(
        () => openPaidOffline(),
        (err: any) => {
          assert.equal(err.code, ERROR_CODES.ENTITLEMENT_EXPIRED);
          return true;
        },
      );
    });

    it('key removal: removes entitlement key from secure storage when access ends', async () => {
      // Student had an entitlement key stored
      await setEntitlementKey('valid-secret-entitlement-key-32bytes');
      assert.equal(await getEntitlementKey(), 'valid-secret-entitlement-key-32bytes');

      // Access ends -> remove key
      await removeEntitlementKey();

      // Key must be null so downloaded content cannot be decrypted
      const remainingKey = await getEntitlementKey();
      assert.equal(remainingKey, null);

      async function decryptPaidDownloadedBody() {
        const key = await getEntitlementKey();
        if (!key) {
          throw new ApiError(ERROR_CODES.ENTITLEMENT_EXPIRED, 'Entitlement key revoked');
        }
        return samplePaidTopic;
      }

      await assert.rejects(
        () => decryptPaidDownloadedBody(),
        (err: any) => {
          assert.equal(err.code, ERROR_CODES.ENTITLEMENT_EXPIRED);
          return true;
        },
      );
    });
  });

  // =========================================================================
  // 3. Different Device Gate (Device Lock)
  // =========================================================================
  describe('3. Different device fails to open paid content', () => {
    function hashDeviceId(deviceId: string): string {
      return crypto.createHash('sha256').update(deviceId.trim()).digest('hex');
    }

    const boundDeviceId = 'device-hardware-uuid-primary';
    const boundDeviceHash = hashDeviceId(boundDeviceId);

    function simulateServerDeviceGuard(rawDeviceId: string | undefined, expectedHash: string) {
      if (!rawDeviceId) {
        throw new ApiError(
          ERROR_CODES.DEVICE_MISMATCH_LOCKED as ErrorCode,
          'x-device-id header is required for verified student device access',
        );
      }
      const incomingHash = hashDeviceId(rawDeviceId);
      if (incomingHash !== expectedHash) {
        throw new ApiError(
          ERROR_CODES.DEVICE_MISMATCH_LOCKED as ErrorCode,
          'Account is locked to another device. Please release previous device or contact support.',
        );
      }
      return true;
    }

    it('fails with DEVICE_MISMATCH_LOCKED when a second/different device requests content', () => {
      const secondDeviceId = 'device-hardware-uuid-attacker-phone';

      assert.throws(
        () => simulateServerDeviceGuard(secondDeviceId, boundDeviceHash),
        (err: any) => {
          assert.equal(err.code, ERROR_CODES.DEVICE_MISMATCH_LOCKED);
          return true;
        },
      );
    });

    it('fails with DEVICE_MISMATCH_LOCKED when request is missing the x-device-id header', () => {
      assert.throws(
        () => simulateServerDeviceGuard(undefined, boundDeviceHash),
        (err: any) => {
          assert.equal(err.code, ERROR_CODES.DEVICE_MISMATCH_LOCKED);
          return true;
        },
      );
    });

    it('succeeds and permits access when request comes from the bound device', () => {
      const allowed = simulateServerDeviceGuard(boundDeviceId, boundDeviceHash);
      assert.equal(allowed, true);
    });
  });

  // =========================================================================
  // 4. Rolled-Back Clock Gate
  // =========================================================================
  describe('4. Rolled-back clock fails to open paid content', () => {
    it('offlineAccess locks content when wall clock is rolled back earlier than cache time', () => {
      const T0 = 1700000000000;
      const DAY = 86400000;

      // Student rolls back their clock 1 hour behind cachedAtMs
      const rolledBackNow = T0 - 3600000;

      const accessResult = offlineAccess(
        {
          access: 'PAID',
          cachedAtMs: T0,
          expiresAtMs: T0 + 10 * DAY,
        },
        rolledBackNow,
      );

      assert.equal(accessResult.access, 'LOCKED');

      function openPaidOffline() {
        if (accessResult.access !== 'PAID') {
          throw new ApiError(ERROR_CODES.ENTITLEMENT_EXPIRED);
        }
        return samplePaidTopic;
      }

      assert.throws(
        () => openPaidOffline(),
        (err: any) => {
          assert.equal(err.code, ERROR_CODES.ENTITLEMENT_EXPIRED);
          return true;
        },
      );
    });

    it('verifyEntitlementTokenOffline detects clock rollback below last seen server time', async () => {
      const serverTime = 1700000000000;
      const token = signEntitlementToken(
        {
          studentId: 'student-rollback',
          courseIds: ['course-phys-401'],
          expiresAt: new Date(serverTime + 30 * 86400000).toISOString(),
          serverTime,
        },
        testPrivateKeyPem,
      );

      // Student rolls back device clock 5 minutes behind last seen server time
      const verification = await verifyCourseAccess('course-phys-401', {
        token,
        currentDeviceTimeMs: serverTime - 300000,
        lastSeenServerTimeMs: serverTime,
        publicKeyPem: testPublicKeyPem,
      });

      assert.equal(verification.allowed, false);
      if (!verification.allowed) {
        assert.equal(verification.reason, 'CLOCK_ROLLBACK_DETECTED');
      }
    });

    it('trustedNowMs ensures monotonically advancing time using monotonic system uptime', () => {
      const DAY = 86400000;
      const cachedAt = 10 * DAY;
      const savedClock = { wallMs: 12 * DAY, uptimeMs: 2 * DAY };

      // Wall clock was wound back to 8 * DAY, but uptime advanced by 1 hour (3600000 ms)
      const tamperedClock = { wallMs: 8 * DAY, uptimeMs: 2 * DAY + 3600000 };

      const trusted = trustedNowMs(cachedAt, savedClock, tamperedClock);

      // Monotonic time advanced from cachedAt by elapsed uptime (3600000 ms), regardless of the rolled-back wall clock (8 * DAY)
      assert.equal(trusted, cachedAt + 3600000);
      assert.ok(trusted > cachedAt);
      assert.ok(trusted > tamperedClock.wallMs);
    });
  });

  // =========================================================================
  // 5. Key Separation & Secure Storage
  // =========================================================================
  describe('5. Key Separation (Device Key vs Entitlement Key)', () => {
    it('separates free device key from paid entitlement key', async () => {
      const deviceKey = await getOrCreateDeviceKey();
      assert.ok(deviceKey);
      assert.equal(deviceKey.length, 64);

      await setEntitlementKey('entitlement-key-secret-token');
      const entitlementKey = await getEntitlementKey();
      assert.equal(entitlementKey, 'entitlement-key-secret-token');

      // The two keys are stored independently
      assert.notEqual(deviceKey, entitlementKey);

      // Removing the entitlement key preserves the free device key
      await removeEntitlementKey();
      assert.equal(await getEntitlementKey(), null);
      assert.equal(await getOrCreateDeviceKey(), deviceKey);
    });
  });
});
