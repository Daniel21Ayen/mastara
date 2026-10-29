// packages/domain/src/pricing/pricing.test.ts
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  calculateBundlePrice,
  checkBundleSize,
  roundCurrency,
  validateBundleSelection,
  type AdminBundleConfig,
  type CourseSelectionItem,
} from './bundle';
import {
  calculateExtraCoursePrice,
  type ExtraCourseTier,
} from './quote';

describe('Consolidated SRS v1.0: Admin-Configured Pricing & Bundle Rules', () => {
  const adminSemesterConfig: AdminBundleConfig = {
    minCourses: 7,
    maxCourses: 10,
    pricingMode: 'CALCULATED',
    discountPercent: 15,
    allowedSemesterId: 'sem-freshman-1',
    allowedStream: 'NATURAL',
  };

  test('validateBundleSelection: accepts valid boundary counts (min and max inclusive)', () => {
    const makeCourses = (n: number): CourseSelectionItem[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `course-${i + 1}`,
        priceETB: 50,
        isActive: true,
        semesterId: 'sem-freshman-1',
        stream: 'NATURAL',
      }));

    // Lower boundary: exactly 7 courses
    const boundaryMin = validateBundleSelection(makeCourses(7), adminSemesterConfig);
    assert.equal(boundaryMin.valid, true);
    if (boundaryMin.valid) {
      assert.equal(boundaryMin.uniqueCount, 7);
    }

    // Upper boundary: exactly 10 courses
    const boundaryMax = validateBundleSelection(makeCourses(10), adminSemesterConfig);
    assert.equal(boundaryMax.valid, true);
    if (boundaryMax.valid) {
      assert.equal(boundaryMax.uniqueCount, 10);
    }
  });

  test('validateBundleSelection: rejects below minimum (< minCourses) with clear error code', () => {
    const courses: CourseSelectionItem[] = Array.from({ length: 6 }, (_, i) => ({
      id: `course-${i + 1}`,
      priceETB: 50,
      isActive: true,
      semesterId: 'sem-freshman-1',
      stream: 'NATURAL',
    }));

    const result = validateBundleSelection(courses, adminSemesterConfig);
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.reason, 'BELOW_MINIMUM');
      assert.equal(result.minCourses, 7);
      assert.equal(result.maxCourses, 10);
      assert.ok(result.message.includes('minimum required is 7'));
    }
  });

  test('validateBundleSelection: rejects above maximum (> maxCourses) with clear error code', () => {
    const courses: CourseSelectionItem[] = Array.from({ length: 11 }, (_, i) => ({
      id: `course-${i + 1}`,
      priceETB: 50,
      isActive: true,
      semesterId: 'sem-freshman-1',
      stream: 'NATURAL',
    }));

    const result = validateBundleSelection(courses, adminSemesterConfig);
    assert.equal(result.valid, false);
    if (!result.valid) {
      assert.equal(result.reason, 'ABOVE_MAXIMUM');
      assert.equal(result.minCourses, 7);
      assert.equal(result.maxCourses, 10);
      assert.ok(result.message.includes('maximum allowed is 10'));
    }
  });

  test('validateBundleSelection: deduplicates duplicates and rejects if duplicates forbidden', () => {
    const coursesWithDups: CourseSelectionItem[] = [
      { id: 'c-1', priceETB: 40, isActive: true, semesterId: 'sem-freshman-1', stream: 'NATURAL' },
      { id: 'c-1', priceETB: 40, isActive: true, semesterId: 'sem-freshman-1', stream: 'NATURAL' }, // duplicate
      { id: 'c-2', priceETB: 40, isActive: true, semesterId: 'sem-freshman-1', stream: 'NATURAL' },
      { id: 'c-3', priceETB: 40, isActive: true, semesterId: 'sem-freshman-1', stream: 'NATURAL' },
      { id: 'c-4', priceETB: 40, isActive: true, semesterId: 'sem-freshman-1', stream: 'NATURAL' },
      { id: 'c-5', priceETB: 40, isActive: true, semesterId: 'sem-freshman-1', stream: 'NATURAL' },
      { id: 'c-6', priceETB: 40, isActive: true, semesterId: 'sem-freshman-1', stream: 'NATURAL' },
      { id: 'c-7', priceETB: 40, isActive: true, semesterId: 'sem-freshman-1', stream: 'NATURAL' },
    ];

    // Default mode: deduplicates -> 7 unique courses -> valid
    const deduplicatedResult = validateBundleSelection(coursesWithDups, adminSemesterConfig);
    assert.equal(deduplicatedResult.valid, true);
    if (deduplicatedResult.valid) {
      assert.equal(deduplicatedResult.uniqueCount, 7);
    }

    // Strict mode: rejectDuplicates = true -> rejects with DUPLICATE_COURSES
    const strictResult = validateBundleSelection(coursesWithDups, adminSemesterConfig, true);
    assert.equal(strictResult.valid, false);
    if (!strictResult.valid) {
      assert.equal(strictResult.reason, 'DUPLICATE_COURSES');
    }
  });

  test('validateBundleSelection: rejects inactive or scope mismatched courses', () => {
    const courses: CourseSelectionItem[] = Array.from({ length: 7 }, (_, i) => ({
      id: `course-${i + 1}`,
      priceETB: 50,
      isActive: i !== 3, // course-4 is inactive
      semesterId: 'sem-freshman-1',
      stream: 'NATURAL',
    }));

    const inactiveResult = validateBundleSelection(courses, adminSemesterConfig);
    assert.equal(inactiveResult.valid, false);
    if (!inactiveResult.valid) {
      assert.equal(inactiveResult.reason, 'INACTIVE_COURSE');
    }

    // Wrong semester scope
    const coursesWrongSemester: CourseSelectionItem[] = Array.from({ length: 7 }, (_, i) => ({
      id: `course-${i + 1}`,
      priceETB: 50,
      isActive: true,
      semesterId: i === 0 ? 'sem-wrong' : 'sem-freshman-1',
      stream: 'NATURAL',
    }));

    const scopeResult = validateBundleSelection(coursesWrongSemester, adminSemesterConfig);
    assert.equal(scopeResult.valid, false);
    if (!scopeResult.valid) {
      assert.equal(scopeResult.reason, 'SCOPE_MISMATCH');
    }
  });

  test('calculateBundlePrice: CALCULATED mode sums unique prices and applies admin discount', () => {
    // 7 courses at 50 ETB each = BaseAmount 350 ETB
    // Admin configured discount = 20% -> DiscountAmount = 70 ETB -> BundlePrice = 280 ETB
    const courses: CourseSelectionItem[] = Array.from({ length: 7 }, (_, i) => ({
      id: `c-${i + 1}`,
      priceETB: 50,
    }));

    const config: AdminBundleConfig = {
      minCourses: 7,
      maxCourses: 10,
      pricingMode: 'CALCULATED',
      discountPercent: 20,
    };

    const calculation = calculateBundlePrice(courses, config);
    assert.equal(calculation.pricingMode, 'CALCULATED');
    assert.equal(calculation.baseAmount, 350);
    assert.equal(calculation.discountPercent, 20);
    assert.equal(calculation.discountAmount, 70);
    assert.equal(calculation.bundlePrice, 280);
  });

  test('calculateBundlePrice: FIXED mode returns admin configured fixedPriceETB override', () => {
    const courses: CourseSelectionItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: `c-${i + 1}`,
      priceETB: 60,
    }));

    const config: AdminBundleConfig = {
      minCourses: 7,
      maxCourses: 10,
      pricingMode: 'FIXED',
      fixedPriceETB: 249.99,
    };

    const calculation = calculateBundlePrice(courses, config);
    assert.equal(calculation.pricingMode, 'FIXED');
    assert.equal(calculation.baseAmount, 480);
    assert.equal(calculation.bundlePrice, 249.99);
    assert.equal(calculation.discountAmount, 230.01);
  });

  test('calculateExtraCoursePrice: applies admin-entered ordinal count bands accurately', () => {
    // Illustrative tier schedule from SRS Section 4.4 & Section 11:
    // Extra course #1: 100 ETB
    // Extra courses #2-#5: 50 ETB each
    // Extra courses #6 and above: 40 ETB each
    const adminTiers: ExtraCourseTier[] = [
      { fromOrdinal: 1, toOrdinal: 1, priceETB: 100 },
      { fromOrdinal: 2, toOrdinal: 5, priceETB: 50 },
      { fromOrdinal: 6, toOrdinal: undefined, priceETB: 40 },
    ];

    // Case 1: 0 extras
    const zeroExtras = calculateExtraCoursePrice(0, adminTiers);
    assert.equal(zeroExtras.total, 0);
    assert.equal(zeroExtras.lines.length, 0);

    // Case 2: 1 extra course (#1 -> 100 ETB)
    const oneExtra = calculateExtraCoursePrice(1, adminTiers);
    assert.equal(oneExtra.total, 100);
    assert.equal(oneExtra.lines.length, 1);
    assert.equal(oneExtra.lines[0]?.priceETB, 100);

    // Case 3: 3 extra courses (1x100 + 2x50 = 200 ETB)
    const threeExtras = calculateExtraCoursePrice(3, adminTiers);
    assert.equal(threeExtras.total, 200);
    assert.equal(threeExtras.lines.length, 3);
    assert.equal(threeExtras.lines[0]?.priceETB, 100);
    assert.equal(threeExtras.lines[1]?.priceETB, 50);
    assert.equal(threeExtras.lines[2]?.priceETB, 50);

    // Case 4: Exactly 7 extra courses from SRS example:
    // 1x100 + 4x50 + 2x40 = 380 ETB
    const sevenExtras = calculateExtraCoursePrice(7, adminTiers);
    assert.equal(sevenExtras.total, 380);
    assert.equal(sevenExtras.lines.length, 7);
    assert.equal(sevenExtras.lines[0]?.priceETB, 100); // #1
    assert.equal(sevenExtras.lines[1]?.priceETB, 50);  // #2
    assert.equal(sevenExtras.lines[2]?.priceETB, 50);  // #3
    assert.equal(sevenExtras.lines[3]?.priceETB, 50);  // #4
    assert.equal(sevenExtras.lines[4]?.priceETB, 50);  // #5
    assert.equal(sevenExtras.lines[5]?.priceETB, 40);  // #6
    assert.equal(sevenExtras.lines[6]?.priceETB, 40);  // #7
  });

  test('checkBundleSize: enforces min and max bounds', () => {
    assert.deepEqual(checkBundleSize(5, { bundlePrice: 200, minCourses: 7, maxCourses: 10, extraCoursePrices: [100, 50] }), {
      valid: false,
      reason: 'TOO_FEW',
    });
    assert.deepEqual(checkBundleSize(7, { bundlePrice: 200, minCourses: 7, maxCourses: 10, extraCoursePrices: [100, 50] }), {
      valid: true,
    });
    assert.deepEqual(checkBundleSize(10, { bundlePrice: 200, minCourses: 7, maxCourses: 10, extraCoursePrices: [100, 50] }), {
      valid: true,
    });
    assert.deepEqual(checkBundleSize(11, { bundlePrice: 200, minCourses: 7, maxCourses: 10, extraCoursePrices: [100, 50] }), {
      valid: false,
      reason: 'TOO_MANY',
    });
  });

  test('roundCurrency: handles decimals and prevents floating-point inaccuracies', () => {
    assert.equal(roundCurrency(100.1234), 100.12);
    assert.equal(roundCurrency(380.00000000004), 380);
    assert.equal(roundCurrency(0.1 + 0.2), 0.3);
  });
});
