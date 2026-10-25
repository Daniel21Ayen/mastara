// apps/mobile/src/modules/phase9.device-tests.test.ts
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { Topic } from '@mastara/contracts';
import {
  ERROR_CODES,
  offlineAccess,
  resolveOpen,
  type AccessState,
  type CachedAccess,
} from '@mastara/domain';

import { downloadStore, contentKey } from '../core/downloads';
import { ApiError } from '../core/network/ApiError';
import { isOnline, setForcedOffline } from '../core/network/connectivity';
import { contentApi, topicKey } from './courses/api/content.api';
import { myCoursesApi } from './my-courses/api/myCourses.api';
import { readerMemoryCache } from './reader/store/readerMemoryCache';

describe('Phase 9: Device Tests with Airplane Mode (Four Core Account States)', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const T0 = 1700000000000;

  const testCourseId = 'course-phase9-device-101';
  const paidTopicId = 'topic-paid-physics-1';
  const freeTopicId = 'topic-free-physics-0';

  const mockPaidTopic: Topic = {
    id: paidTopicId,
    courseId: testCourseId,
    kind: 'MODULE',
    number: 1,
    title: { en: 'Advanced Electromagnetism', am: 'የላቀ ኤሌክትሮማግኔቲዝም' },
    summary: { en: 'Paid curriculum module', am: 'የሚከፈልበት የትምህርት ሞጁል' },
    body: { en: 'Maxwell equations and wave propagation deep-dive.', am: 'የማክስዌል እኩልታዎች ዝርዝር።' },
    isFree: false,
  };

  const mockFreeTopic: Topic = {
    id: freeTopicId,
    courseId: testCourseId,
    kind: 'MODULE',
    number: 0,
    title: { en: 'Introduction to Physics', am: 'የፊዚክስ መግቢያ' },
    summary: { en: 'Free preview module', am: 'ነጻ የቅድመ እይታ ሞጁል' },
    body: { en: 'Welcome to fundamental physics principles.', am: 'እንኳን ወደ መሰረታዊ ፊዚክስ መርሆዎች በደህና መጡ።' },
    isFree: true,
  };

  beforeEach(async () => {
    // Clear ephemeral reader RAM cache and reset network state
    readerMemoryCache.clear();
    setForcedOffline(false);

    // Seed downloaded topics into downloadStore so local reading is possible
    const paidKey = topicKey(paidTopicId);
    await downloadStore.saveUnit(
      {
        unitId: paidTopicId,
        kind: 'TOPIC',
        courseId: testCourseId,
        title: 'Advanced Electromagnetism',
        meta: mockPaidTopic,
      },
      [{ key: paidKey, value: mockPaidTopic }],
    );

    const freeKey = topicKey(freeTopicId);
    await downloadStore.saveUnit(
      {
        unitId: freeTopicId,
        kind: 'TOPIC',
        courseId: testCourseId,
        title: 'Introduction to Physics',
        meta: mockFreeTopic,
      },
      [{ key: freeKey, value: mockFreeTopic }],
    );
  });

  // =========================================================================
  // Account 1: UNPAID Student in Airplane Mode
  // =========================================================================
  describe('1. Unpaid Account (Airplane Mode)', () => {
    it('opens downloaded free topic, but locks paid topic in airplane mode', async () => {
      // 1. Switch device to airplane mode
      setForcedOffline(true);
      assert.strictEqual(isOnline(), false, 'Device should be in airplane mode');

      // Mock myCoursesApi to report LOCKED / FREE_TRIAL for unpaid student
      const originalGetMyCourses = myCoursesApi.getMyCourses;
      myCoursesApi.getMyCourses = async () => [
        {
          id: testCourseId,
          title: 'Physics 101',
          code: 'PHYS101',
          thumbnail: '',
          stream: 'NATURAL',
          progressPct: 0,
          access: 'LOCKED',
          cachedAtMs: T0,
        },
      ];

      try {
        // Free topic: Opens locally in airplane mode
        const freeTopic = await contentApi.getTopic(freeTopicId);
        assert.ok(freeTopic, 'Unpaid student must open downloaded free topic');
        assert.strictEqual(freeTopic.id, freeTopicId);
        assert.strictEqual(freeTopic.isFree, true);

        // Paid topic: Locked, throws ENTITLEMENT_EXPIRED / ACCESS_DENIED
        await assert.rejects(
          async () => contentApi.getTopic(paidTopicId),
          (err: any) => {
            assert.ok(err instanceof ApiError);
            assert.strictEqual(err.code, ERROR_CODES.ENTITLEMENT_EXPIRED);
            return true;
          },
        );

        // Matrix check
        assert.strictEqual(
          resolveOpen({ access: 'LOCKED', isFree: true, isDownloaded: true, isOnline: false }),
          'OPEN_LOCAL',
        );
        assert.strictEqual(
          resolveOpen({ access: 'LOCKED', isFree: false, isDownloaded: true, isOnline: false }),
          'LOCKED',
        );
      } finally {
        myCoursesApi.getMyCourses = originalGetMyCourses;
      }
    });
  });

  // =========================================================================
  // Account 2: PAID Student in Airplane Mode
  // =========================================================================
  describe('2. Paid Account (Airplane Mode)', () => {
    it('seamlessly opens downloaded paid topics and quizzes completely offline', async () => {
      // 1. Switch device to airplane mode
      setForcedOffline(true);
      assert.strictEqual(isOnline(), false, 'Device should be in airplane mode');

      // Student has valid active entitlement cached
      const originalGetMyCourses = myCoursesApi.getMyCourses;
      myCoursesApi.getMyCourses = async () => [
        {
          id: testCourseId,
          title: 'Physics 101',
          code: 'PHYS101',
          thumbnail: '',
          stream: 'NATURAL',
          progressPct: 45,
          access: 'PAID',
          cachedAtMs: T0,
          expiresAtMs: T0 + 30 * DAY_MS,
        },
      ];

      try {
        // Paid topic: Successfully opens from local storage
        const topic = await contentApi.getTopic(paidTopicId);
        assert.ok(topic, 'Paid student must open downloaded paid topic in airplane mode');
        assert.strictEqual(topic.id, paidTopicId);
        assert.strictEqual(topic.body?.en, 'Maxwell equations and wave propagation deep-dive.');

        // Verify offlineAccess verification passes
        const cached: CachedAccess = {
          access: 'PAID',
          cachedAtMs: T0,
          expiresAtMs: T0 + 30 * DAY_MS,
        };
        const verification = offlineAccess(cached, T0 + 2 * DAY_MS);
        assert.strictEqual(verification.access, 'PAID');
        assert.strictEqual(verification.daysLeft, 28);

        // Matrix check
        assert.strictEqual(
          resolveOpen({ access: 'PAID', isFree: false, isDownloaded: true, isOnline: false }),
          'OPEN_LOCAL',
        );
      } finally {
        myCoursesApi.getMyCourses = originalGetMyCourses;
      }
    });
  });

  // =========================================================================
  // Account 3: EXPIRED Account in Airplane Mode
  // =========================================================================
  describe('3. Expired Account (Airplane Mode)', () => {
    it('blocks paid downloaded content with ENTITLEMENT_EXPIRED while keeping free content accessible', async () => {
      // 1. Switch device to airplane mode
      setForcedOffline(true);

      // Student entitlement has passed expiration date
      const expiredAt = T0 - 1000;
      const originalGetMyCourses = myCoursesApi.getMyCourses;
      myCoursesApi.getMyCourses = async () => [
        {
          id: testCourseId,
          title: 'Physics 101',
          code: 'PHYS101',
          thumbnail: '',
          stream: 'NATURAL',
          progressPct: 80,
          access: 'LOCKED', // Evaluated as locked because expired
          cachedAtMs: T0 - 30 * DAY_MS,
          expiresAtMs: expiredAt,
        },
      ];

      try {
        // Verification function locks access
        const cached: CachedAccess = {
          access: 'PAID',
          cachedAtMs: T0 - 30 * DAY_MS,
          expiresAtMs: expiredAt,
        };
        const result = offlineAccess(cached, T0);
        assert.strictEqual(result.access, 'LOCKED', 'Expired subscription must resolve to LOCKED');

        // Paid topic: Blocked
        await assert.rejects(
          async () => contentApi.getTopic(paidTopicId),
          (err: any) => {
            assert.ok(err instanceof ApiError);
            assert.strictEqual(err.code, ERROR_CODES.ENTITLEMENT_EXPIRED);
            return true;
          },
        );

        // Free topic: Still accessible even when subscription expired
        const freeTopic = await contentApi.getTopic(freeTopicId);
        assert.ok(freeTopic, 'Free topic remains accessible after paid subscription expires');
        assert.strictEqual(freeTopic.id, freeTopicId);

        // Matrix check
        assert.strictEqual(
          resolveOpen({ access: 'LOCKED', isFree: false, isDownloaded: true, isOnline: false }),
          'LOCKED',
        );
        assert.strictEqual(
          resolveOpen({ access: 'LOCKED', isFree: true, isDownloaded: true, isOnline: false }),
          'OPEN_LOCAL',
        );
      } finally {
        myCoursesApi.getMyCourses = originalGetMyCourses;
      }
    });
  });

  // =========================================================================
  // Account 4: PAID-THEN-OFFLINE FOR 8 DAYS in Airplane Mode
  // =========================================================================
  describe('4. Paid-then-offline for 8 Days (Grace Period Exceeded)', () => {
    it('locks paid content after 8 days of airplane mode (>7 days grace), unlocks upon reconnect', async () => {
      const cachedAt = T0;
      const eightDaysLater = T0 + 8 * DAY_MS;

      // 1. Device in airplane mode continuously for 8 days
      setForcedOffline(true);

      const originalGetMyCourses = myCoursesApi.getMyCourses;
      let currentAccess: AccessState = 'PAID';

      // Simulate local course verification using offlineAccess rules
      myCoursesApi.getMyCourses = async () => {
        const cached: CachedAccess = {
          access: currentAccess,
          cachedAtMs: cachedAt,
          expiresAtMs: cachedAt + 30 * DAY_MS,
        };
        const res = offlineAccess(cached, eightDaysLater, 7); // 7-day grace period
        return [
          {
            id: testCourseId,
            title: 'Physics 101',
            code: 'PHYS101',
            thumbnail: '',
            stream: 'NATURAL',
            progressPct: 50,
            access: res.access,
            cachedAtMs: cachedAt,
            expiresAtMs: cachedAt + 30 * DAY_MS,
          },
        ];
      };

      try {
        // Verify offlineAccess locked it because 8 days > 7 days OFFLINE_GRACE_DAYS
        const cached: CachedAccess = {
          access: 'PAID',
          cachedAtMs: cachedAt,
          expiresAtMs: cachedAt + 30 * DAY_MS,
        };
        const verification = offlineAccess(cached, eightDaysLater, 7);
        assert.strictEqual(
          verification.access,
          'LOCKED',
          'Paid account offline for 8 days must be locked (7-day grace exceeded)',
        );

        // Attempting to open paid topic fails with ENTITLEMENT_EXPIRED (prompts student to reconnect)
        await assert.rejects(
          async () => contentApi.getTopic(paidTopicId),
          (err: any) => {
            assert.ok(err instanceof ApiError);
            assert.strictEqual(err.code, ERROR_CODES.ENTITLEMENT_EXPIRED);
            return true;
          },
        );

        // Free topic is STILL readable
        const freeTopic = await contentApi.getTopic(freeTopicId);
        assert.ok(freeTopic, 'Free topic remains readable even after offline grace period ends');

        // 2. Student reconnects to internet (airplane mode disabled)
        setForcedOffline(false);
        assert.strictEqual(isOnline(), true, 'Device reconnected to network');

        // Server confirms active entitlement -> updates cachedAt to current time
        const reconnectedAt = eightDaysLater;
        myCoursesApi.getMyCourses = async () => [
          {
            id: testCourseId,
            title: 'Physics 101',
            code: 'PHYS101',
            thumbnail: '',
            stream: 'NATURAL',
            progressPct: 50,
            access: 'PAID',
            cachedAtMs: reconnectedAt,
            expiresAtMs: cachedAt + 30 * DAY_MS,
          },
        ];

        // Reader cache clear
        readerMemoryCache.clear();

        // Paid topic now opens successfully again
        const reconnectedTopic = await contentApi.getTopic(paidTopicId);
        assert.ok(reconnectedTopic, 'Paid topic opens immediately upon reconnection');
        assert.strictEqual(reconnectedTopic.id, paidTopicId);
      } finally {
        myCoursesApi.getMyCourses = originalGetMyCourses;
      }
    });
  });
});
