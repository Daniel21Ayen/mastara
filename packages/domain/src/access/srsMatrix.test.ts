// packages/domain/src/access/srsMatrix.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canOpen } from './canOpen';
import type { StudentAccessContext } from './canOpen';
import { resolveOpen } from './resolveOpen';

describe('SRS 5.2: Access Evaluation Order Matrix (canOpen)', () => {
  const entitledStudent: StudentAccessContext = {
    id: 'student-entitled',
    activeCourseIds: ['course-math-101'],
  };

  const unentitledStudent: StudentAccessContext = {
    id: 'student-unentitled',
    activeCourseIds: [],
  };

  it('Order 1: Item inactive, unpublished, or deleted -> UNAVAILABLE', () => {
    // Inactive with active entitlement
    const resInactive = canOpen(entitledStudent, {
      courseId: 'course-math-101',
      isActive: false,
      status: 'PUBLISHED',
      isCourseFree: true,
      isItemFree: true,
    });
    assert.deepStrictEqual(resInactive, { canOpen: false, reason: 'UNAVAILABLE' });

    // Unpublished / Draft with active entitlement
    const resDraft = canOpen(entitledStudent, {
      courseId: 'course-math-101',
      status: 'DRAFT',
      isCourseFree: true,
      isItemFree: true,
    });
    assert.deepStrictEqual(resDraft, { canOpen: false, reason: 'UNAVAILABLE' });

    // Archived item
    const resArchived = canOpen(entitledStudent, {
      courseId: 'course-math-101',
      status: 'ARCHIVED',
    });
    assert.deepStrictEqual(resArchived, { canOpen: false, reason: 'UNAVAILABLE' });
  });

  it('Order 2: Student has active entitlement for the item course -> ENTITLED (open)', () => {
    const res = canOpen(entitledStudent, {
      courseId: 'course-math-101',
      status: 'PUBLISHED',
      isActive: true,
      isCourseFree: false,
      isItemFree: false,
    });
    assert.deepStrictEqual(res, { canOpen: true, reason: 'ENTITLED' });

    // Custom entitlement predicate
    const customStudent: StudentAccessContext = {
      hasActiveEntitlement: (id) => id === 'course-physics',
    };
    const resPred = canOpen(customStudent, {
      courseId: 'course-physics',
      status: 'PUBLISHED',
    });
    assert.deepStrictEqual(resPred, { canOpen: true, reason: 'ENTITLED' });
  });

  it('Order 3: Course has Free Access -> FREE_COURSE (open)', () => {
    const res = canOpen(unentitledStudent, {
      courseId: 'course-common-intro',
      status: 'PUBLISHED',
      isActive: true,
      isCourseFree: true,
      isItemFree: false,
    });
    assert.deepStrictEqual(res, { canOpen: true, reason: 'FREE_COURSE' });

    // Anonymous visitor (null student)
    const resAnon = canOpen(null, {
      courseId: 'course-common-intro',
      status: 'PUBLISHED',
      isActive: true,
      isCourseFree: true,
    });
    assert.deepStrictEqual(resAnon, { canOpen: true, reason: 'FREE_COURSE' });
  });

  it('Order 4: Item is free at item level (chapter Free flag, trial, sample) -> FREE_ITEM (open)', () => {
    // Chapter free flag
    const resChapter = canOpen(unentitledStudent, {
      courseId: 'course-paid',
      status: 'PUBLISHED',
      isActive: true,
      isCourseFree: false,
      isItemFree: true,
    });
    assert.deepStrictEqual(resChapter, { canOpen: true, reason: 'FREE_ITEM' });

    // Free trial items
    const resTrial = canOpen(unentitledStudent, {
      courseId: 'course-paid',
      status: 'PUBLISHED',
      isActive: true,
      isFreeTrial: true,
    });
    assert.deepStrictEqual(resTrial, { canOpen: true, reason: 'FREE_ITEM' });

    // COC sample set
    const resSample = canOpen(null, {
      courseId: 'course-paid',
      status: 'PUBLISHED',
      isActive: true,
      isSample: true,
    });
    assert.deepStrictEqual(resSample, { canOpen: true, reason: 'FREE_ITEM' });
  });

  it('Order 5: Otherwise -> LOCKED', () => {
    const resLocked = canOpen(unentitledStudent, {
      courseId: 'course-paid',
      status: 'PUBLISHED',
      isActive: true,
      isCourseFree: false,
      isItemFree: false,
      isFreeTrial: false,
      isSample: false,
    });
    assert.deepStrictEqual(resLocked, { canOpen: false, reason: 'LOCKED' });

    // Unregistered visitor on paid item
    const resAnon = canOpen(null, {
      courseId: 'course-paid',
      status: 'PUBLISHED',
    });
    assert.deepStrictEqual(resAnon, { canOpen: false, reason: 'LOCKED' });
  });
});

describe('SRS 5.3: Visibility and Opening Content Matrix (resolveOpen)', () => {
  // Row 2: Free item, Online, Not downloaded -> Opens from server (OPEN_ONLINE)
  it('Row 2: Free item, Online, Not downloaded -> OPEN_ONLINE', () => {
    const res = resolveOpen({
      access: 'LOCKED',
      isFree: true,
      isDownloaded: false,
      isOnline: true,
    });
    assert.equal(res, 'OPEN_ONLINE');
  });

  // Row 3: Free item, Offline, Downloaded -> Opens from local copy (OPEN_LOCAL)
  it('Row 3: Free item, Offline, Downloaded -> OPEN_LOCAL', () => {
    const res = resolveOpen({
      access: 'LOCKED',
      isFree: true,
      isDownloaded: true,
      isOnline: false,
    });
    assert.equal(res, 'OPEN_LOCAL');
  });

  // Row 4: Free item, Offline, Not downloaded -> Message: offline, download this item while online (NEEDS_INTERNET)
  it('Row 4: Free item, Offline, Not downloaded -> NEEDS_INTERNET', () => {
    const res = resolveOpen({
      access: 'LOCKED',
      isFree: true,
      isDownloaded: false,
      isOnline: false,
    });
    assert.equal(res, 'NEEDS_INTERNET');
  });

  // Row 5: Paid item, student has paid, Online, Not downloaded -> Opens from server (OPEN_ONLINE)
  it('Row 5: Paid item, student has paid, Online, Not downloaded -> OPEN_ONLINE', () => {
    const res = resolveOpen({
      access: 'PAID',
      isFree: false,
      isDownloaded: false,
      isOnline: true,
    });
    assert.equal(res, 'OPEN_ONLINE');
  });

  // Row 6: Paid item, student has paid, Offline, Downloaded -> Opens until entitlement expires (OPEN_LOCAL)
  it('Row 6: Paid item, student has paid, Offline, Downloaded -> OPEN_LOCAL', () => {
    const res = resolveOpen({
      access: 'PAID',
      isFree: false,
      isDownloaded: true,
      isOnline: false,
    });
    assert.equal(res, 'OPEN_LOCAL');
  });

  // Row 7: Paid item, student has paid, Offline, Not downloaded -> Same offline message (NEEDS_INTERNET)
  it('Row 7: Paid item, student has paid, Offline, Not downloaded -> NEEDS_INTERNET', () => {
    const res = resolveOpen({
      access: 'PAID',
      isFree: false,
      isDownloaded: false,
      isOnline: false,
    });
    assert.equal(res, 'NEEDS_INTERNET');
  });

  // Row 8: Paid item, student has not paid, Any network, Any downloaded -> Paywall sheet (LOCKED)
  it('Row 8: Paid item, student has not paid, Any network, Any downloaded -> LOCKED', () => {
    for (const isOnline of [true, false]) {
      for (const isDownloaded of [true, false]) {
        const res = resolveOpen({
          access: 'LOCKED',
          isFree: false,
          isDownloaded,
          isOnline,
        });
        assert.equal(res, 'LOCKED');
      }
    }
  });

  // Row 9: Paid item, entitlement expired, Any network, Downloaded -> Locked; downloaded copy stops opening (LOCKED)
  it('Row 9: Paid item, entitlement expired, Any network, Downloaded -> LOCKED', () => {
    for (const isOnline of [true, false]) {
      const res = resolveOpen({
        access: 'EXPIRED' as any,
        isFree: false,
        isDownloaded: true,
        isOnline,
      });
      assert.equal(res, 'LOCKED');
    }
  });
});
