// packages/domain/src/access/canOpen.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { canOpen } from './canOpen';
import type { AccessibleItem, StudentAccessContext } from './canOpen';

test('canOpen: Access Evaluation Order Matrix', async (t) => {
  const entitledStudent: StudentAccessContext = {
    id: 'student-1',
    activeCourseIds: ['course-101'],
  };

  const unentitledStudent: StudentAccessContext = {
    id: 'student-2',
    activeCourseIds: [],
  };

  await t.test('1. Unpublished or inactive items are UNAVAILABLE even with active entitlement or free flags', () => {
    // Draft with active entitlement
    const resDraftEntitled = canOpen(entitledStudent, {
      courseId: 'course-101',
      status: 'DRAFT',
      isCourseFree: true,
      isItemFree: true,
    });
    assert.deepStrictEqual(resDraftEntitled, { canOpen: false, reason: 'UNAVAILABLE' });

    // Inactive with active entitlement
    const resInactive = canOpen(entitledStudent, {
      courseId: 'course-101',
      status: 'PUBLISHED',
      isActive: false,
      isCourseFree: true,
    });
    assert.deepStrictEqual(resInactive, { canOpen: false, reason: 'UNAVAILABLE' });

    // Archived item
    const resArchived = canOpen(entitledStudent, {
      courseId: 'course-101',
      status: 'ARCHIVED',
    });
    assert.deepStrictEqual(resArchived, { canOpen: false, reason: 'UNAVAILABLE' });
  });

  await t.test('2. Active entitlement opens published item even if course and item are paid/locked', () => {
    const res = canOpen(entitledStudent, {
      courseId: 'course-101',
      status: 'PUBLISHED',
      isCourseFree: false,
      isItemFree: false,
    });
    assert.deepStrictEqual(res, { canOpen: true, reason: 'ENTITLED' });

    // Entitlement via custom checker predicate
    const predicateStudent: StudentAccessContext = {
      hasActiveEntitlement: (cid) => cid === 'course-custom',
    };
    const resPred = canOpen(predicateStudent, {
      courseId: 'course-custom',
      status: 'PUBLISHED',
    });
    assert.deepStrictEqual(resPred, { canOpen: true, reason: 'ENTITLED' });
  });

  await t.test('3. Free Access course opens published item without student entitlement', () => {
    const res = canOpen(unentitledStudent, {
      courseId: 'course-free-all',
      status: 'PUBLISHED',
      isCourseFree: true,
      isItemFree: false,
    });
    assert.deepStrictEqual(res, { canOpen: true, reason: 'FREE_COURSE' });

    // Anonymous visitor (null student) opens free course
    const resAnon = canOpen(null, {
      courseId: 'course-free-all',
      status: 'PUBLISHED',
      isCourseFree: true,
    });
    assert.deepStrictEqual(resAnon, { canOpen: true, reason: 'FREE_COURSE' });
  });

  await t.test('4. Item-level free flag opens published item even on paid course without entitlement', () => {
    // isItemFree: true
    const resItemFree = canOpen(unentitledStudent, {
      courseId: 'course-paid',
      status: 'PUBLISHED',
      isCourseFree: false,
      isItemFree: true,
    });
    assert.deepStrictEqual(resItemFree, { canOpen: true, reason: 'FREE_ITEM' });

    // isFreeTrial: true (chapter free trial)
    const resFreeTrial = canOpen(unentitledStudent, {
      courseId: 'course-paid',
      status: 'PUBLISHED',
      isFreeTrial: true,
    });
    assert.deepStrictEqual(resFreeTrial, { canOpen: true, reason: 'FREE_ITEM' });

    // isSample: true (COC sample questions)
    const resSample = canOpen(null, {
      courseId: 'course-paid',
      status: 'PUBLISHED',
      isSample: true,
    });
    assert.deepStrictEqual(resSample, { canOpen: true, reason: 'FREE_ITEM' });
  });

  await t.test('5. Otherwise locked when published, unpaid, no item-level free flag, no active entitlement', () => {
    const resLocked = canOpen(unentitledStudent, {
      courseId: 'course-paid',
      status: 'PUBLISHED',
      isCourseFree: false,
      isItemFree: false,
      isFreeTrial: false,
      isSample: false,
    });
    assert.deepStrictEqual(resLocked, { canOpen: false, reason: 'LOCKED' });

    // Completely empty item options default to locked
    const resDefault = canOpen(null, {
      courseId: 'course-paid',
    });
    assert.deepStrictEqual(resDefault, { canOpen: false, reason: 'LOCKED' });
  });
});
