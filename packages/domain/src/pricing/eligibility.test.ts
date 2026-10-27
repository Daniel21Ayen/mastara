// packages/domain/src/pricing/eligibility.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canBuyCourse,
  canPurchaseSingleCourse,
  isBundleProductType,
  validateOrderEligibility,
} from './eligibility';

test('canBuyCourse: allows buying expired or within renewal window', () => {
  assert.equal(canBuyCourse('LOCKED', undefined), true);
  assert.equal(canBuyCourse('FREE_TRIAL', undefined), true);
  assert.equal(canBuyCourse('PAID', 5, 7), true); // within 7 days renewal window
  assert.equal(canBuyCourse('PAID', 30, 7), false); // 30 days left, not renewable yet
});

test('canPurchaseSingleCourse: checks bundle ownership, inclusion and admin toggle (PUR-01..08)', () => {
  // 1. Without active bundle -> locked with BUNDLE_REQUIRED (PUR-03, PUR-06)
  const noBundle = canPurchaseSingleCourse({
    hasActiveBundle: false,
    isCourseInBundle: false,
    singleCoursesEnabled: true,
  });
  assert.equal(noBundle.allowed, false);
  assert.equal(noBundle.reason, 'BUNDLE_REQUIRED');
  assert.ok(noBundle.message?.includes('Buy a semester or full bundle first'));

  // 2. With active bundle, but course already in bundle -> ALREADY_IN_BUNDLE (PUR-07)
  const inBundle = canPurchaseSingleCourse({
    hasActiveBundle: true,
    isCourseInBundle: true,
    singleCoursesEnabled: true,
  });
  assert.equal(inBundle.allowed, false);
  assert.equal(inBundle.reason, 'ALREADY_IN_BUNDLE');

  // 3. With active bundle and course already owned separately -> COURSE_ALREADY_OWNED
  const owned = canPurchaseSingleCourse({
    hasActiveBundle: true,
    isCourseInBundle: false,
    isCourseAlreadyOwned: true,
    singleCoursesEnabled: true,
  });
  assert.equal(owned.allowed, false);
  assert.equal(owned.reason, 'COURSE_ALREADY_OWNED');

  // 4. Admin turned off single courses -> SINGLE_COURSES_DISABLED (PUR-08)
  const disabled = canPurchaseSingleCourse({
    hasActiveBundle: true,
    isCourseInBundle: false,
    singleCoursesEnabled: false,
  });
  assert.equal(disabled.allowed, false);
  assert.equal(disabled.reason, 'SINGLE_COURSES_DISABLED');

  // 5. Eligible: active bundle, not in bundle, not already owned, enabled (PUR-02)
  const eligible = canPurchaseSingleCourse({
    hasActiveBundle: true,
    isCourseInBundle: false,
    singleCoursesEnabled: true,
  });
  assert.equal(eligible.allowed, true);
  assert.equal(eligible.reason, undefined);
});

test('isBundleProductType: identifies bundle types (PUR-10)', () => {
  assert.equal(isBundleProductType('BUNDLE'), true);
  assert.equal(isBundleProductType('FULL_STREAM'), true);
  assert.equal(isBundleProductType('FULL_BOTH'), true);
  assert.equal(isBundleProductType('SINGLE'), false);
  assert.equal(isBundleProductType('EXTRA'), false);
});

test('validateOrderEligibility: enforces API rules for incoming orders (PUR-04, PUR-05)', () => {
  // 1. Unregistered local student buying single course -> REJECTED (PUR-04)
  const unregisteredSingle = validateOrderEligibility({
    productType: 'SINGLE',
    hasActiveBundle: false,
    isUnregisteredLocal: true,
    courseIds: ['course-1'],
  });
  assert.equal(unregisteredSingle.allowed, false);
  assert.equal(unregisteredSingle.reason, 'BUNDLE_REQUIRED');

  // 2. Unregistered local student buying bundle -> ALLOWED (PUR-01, REG-07)
  const unregisteredBundle = validateOrderEligibility({
    productType: 'BUNDLE',
    hasActiveBundle: false,
    isUnregisteredLocal: true,
    courseIds: ['course-1', 'course-2'],
  });
  assert.equal(unregisteredBundle.allowed, true);

  // 3. Registered student without active bundle buying single course -> REJECTED (PUR-05)
  const registeredNoBundle = validateOrderEligibility({
    productType: 'SINGLE',
    hasActiveBundle: false,
    isUnregisteredLocal: false,
    courseIds: ['course-3'],
  });
  assert.equal(registeredNoBundle.allowed, false);
  assert.equal(registeredNoBundle.reason, 'BUNDLE_REQUIRED');

  // 4. Registered student buying single course already in their bundle -> REJECTED (PUR-05)
  const registeredInBundle = validateOrderEligibility({
    productType: 'SINGLE',
    hasActiveBundle: true,
    isUnregisteredLocal: false,
    courseIds: ['course-1'],
    bundleCourseIds: ['course-1', 'course-2'],
  });
  assert.equal(registeredInBundle.allowed, false);
  assert.equal(registeredInBundle.reason, 'ALREADY_IN_BUNDLE');

  // 5. Registered student with active bundle buying an extra course -> ALLOWED (PUR-02)
  const registeredEligible = validateOrderEligibility({
    productType: 'SINGLE',
    hasActiveBundle: true,
    isUnregisteredLocal: false,
    courseIds: ['course-3'],
    bundleCourseIds: ['course-1', 'course-2'],
  });
  assert.equal(registeredEligible.allowed, true);
});
