// packages/domain/src/pricing/bundle.ts

/** Admin-managed values. Default fallback fixtures for test environments. */
export interface BundleRules {
  bundlePrice: number;
  minCourses: number;
  maxCourses: number;
  /** Price of each course beyond maxCourses: first extra, then later extras. */
  extraCoursePrices: readonly number[];
}

export const DEFAULT_BUNDLE_RULES: BundleRules = {
  bundlePrice: 200,
  minCourses: 7,
  maxCourses: 10,
  extraCoursePrices: [100, 50],
};

export const DEFAULT_FULL_PACKAGE_PRICE = 350;

export type BundleCheck =
  | { valid: true }
  | { valid: false; reason: 'TOO_FEW' | 'TOO_MANY' };

/**
 * Checks whether the course count satisfies the bundle boundary constraints.
 * Requirements: Section 4.2 & Section 11 (reject below minimum and above maximum).
 */
export function checkBundleSize(
  count: number,
  rules: BundleRules = DEFAULT_BUNDLE_RULES,
): BundleCheck {
  if (count < rules.minCourses) return { valid: false, reason: 'TOO_FEW' };
  if (count > rules.maxCourses) return { valid: false, reason: 'TOO_MANY' };
  return { valid: true };
}

export interface BundleQuote {
  includedCourses: number;
  extraCourses: number;
  basePrice: number;
  extrasPrice: number;
  total: number;
}

/** Price for a bundle of `count` courses (legacy adapter). */
export function quoteBundle(
  count: number,
  rules: BundleRules = DEFAULT_BUNDLE_RULES,
): BundleQuote {
  const includedCourses = Math.min(count, rules.maxCourses);
  const extraCourses = Math.max(0, count - rules.maxCourses);
  const lastTier = rules.extraCoursePrices[rules.extraCoursePrices.length - 1] ?? 0;

  let extrasPrice = 0;
  for (let i = 0; i < extraCourses; i += 1) {
    extrasPrice += rules.extraCoursePrices[i] ?? lastTier;
  }

  return {
    includedCourses,
    extraCourses,
    basePrice: rules.bundlePrice,
    extrasPrice,
    total: rules.bundlePrice + extrasPrice,
  };
}

// ============================================================================
// Consolidated Requirements (v1.0): Admin-Configured Pricing & Bundle Rules
// ============================================================================

export type BundlePricingMode = 'CALCULATED' | 'FIXED';

export interface AdminBundleConfig {
  minCourses: number;
  maxCourses: number;
  pricingMode: BundlePricingMode;
  discountPercent?: number;
  fixedPriceETB?: number;
  allowedSemesterId?: string;
  allowedStream?: 'NATURAL' | 'SOCIAL' | 'BOTH' | 'ANY';
}

export interface CourseSelectionItem {
  id: string;
  priceETB?: number;
  isActive?: boolean;
  semesterId?: string;
  stream?: string;
}

export type BundleValidationFailureReason =
  | 'BELOW_MINIMUM'
  | 'ABOVE_MAXIMUM'
  | 'DUPLICATE_COURSES'
  | 'INACTIVE_COURSE'
  | 'SCOPE_MISMATCH';

export type BundleValidationResult =
  | {
      valid: true;
      uniqueCourses: CourseSelectionItem[];
      uniqueCount: number;
    }
  | {
      valid: false;
      reason: BundleValidationFailureReason;
      message: string;
      minCourses?: number;
      maxCourses?: number;
    };

/**
 * Validates course selection against admin-configured bundle rules.
 * Requirements: Section 4.2 & Section 11 (validateBundleSelection).
 * Rejects below minimum, above maximum, inactive courses, scope mismatch, and duplicate IDs.
 */
export function validateBundleSelection(
  courses: readonly CourseSelectionItem[],
  config: AdminBundleConfig,
  rejectDuplicates = false,
): BundleValidationResult {
  if (config.minCourses < 1) {
    throw new Error('minCourses must be >= 1');
  }
  if (config.maxCourses < config.minCourses) {
    throw new Error('maxCourses must be >= minCourses');
  }

  const seenIds = new Set<string>();
  const uniqueCourses: CourseSelectionItem[] = [];

  for (const c of courses) {
    if (seenIds.has(c.id)) {
      if (rejectDuplicates) {
        return {
          valid: false,
          reason: 'DUPLICATE_COURSES',
          message: `Duplicate course ID ${c.id} selected in bundle`,
        };
      }
      continue; // deduplicate
    }
    seenIds.add(c.id);

    // Inactive course check
    if (c.isActive === false) {
      return {
        valid: false,
        reason: 'INACTIVE_COURSE',
        message: `Course ${c.id} is inactive or unpublished`,
      };
    }

    // Scope check: semester
    if (config.allowedSemesterId && c.semesterId && c.semesterId !== config.allowedSemesterId) {
      return {
        valid: false,
        reason: 'SCOPE_MISMATCH',
        message: `Course ${c.id} does not match allowed semester ${config.allowedSemesterId}`,
      };
    }

    // Scope check: stream
    if (
      config.allowedStream &&
      config.allowedStream !== 'ANY' &&
      config.allowedStream !== 'BOTH' &&
      c.stream &&
      c.stream !== 'COMMON' &&
      c.stream !== config.allowedStream
    ) {
      return {
        valid: false,
        reason: 'SCOPE_MISMATCH',
        message: `Course ${c.id} with stream ${c.stream} does not match bundle stream ${config.allowedStream}`,
      };
    }

    uniqueCourses.push(c);
  }

  const uniqueCount = uniqueCourses.length;

  if (uniqueCount < config.minCourses) {
    return {
      valid: false,
      reason: 'BELOW_MINIMUM',
      message: `Selected ${uniqueCount} courses, minimum required is ${config.minCourses}`,
      minCourses: config.minCourses,
      maxCourses: config.maxCourses,
    };
  }

  if (uniqueCount > config.maxCourses) {
    return {
      valid: false,
      reason: 'ABOVE_MAXIMUM',
      message: `Selected ${uniqueCount} courses, maximum allowed is ${config.maxCourses}`,
      minCourses: config.minCourses,
      maxCourses: config.maxCourses,
    };
  }

  return {
    valid: true,
    uniqueCourses,
    uniqueCount,
  };
}

export interface BundlePriceCalculation {
  pricingMode: BundlePricingMode;
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  bundlePrice: number;
}

/** Currency rounding to prevent floating-point inaccuracies. */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculates bundle price based on admin configuration.
 * Requirements: Section 4.3 (Calculated mode & Fixed mode).
 *
 * Calculated mode:
 *   BaseAmount = sum(coursePriceETB for each unique course covered by the bundle)
 *   DiscountAmount = roundCurrency(BaseAmount * discountPercent / 100)
 *   BundlePrice = max(0, BaseAmount - DiscountAmount)
 *
 * Fixed mode:
 *   BundlePrice = configured fixedPriceETB
 */
export function calculateBundlePrice(
  courses: readonly CourseSelectionItem[],
  config: AdminBundleConfig,
): BundlePriceCalculation {
  const baseAmount = roundCurrency(
    courses.reduce((sum, c) => sum + (c.priceETB ?? 0), 0),
  );

  if (config.pricingMode === 'FIXED') {
    const fixedPrice = Math.max(0, roundCurrency(config.fixedPriceETB ?? 0));
    return {
      pricingMode: 'FIXED',
      baseAmount,
      discountPercent: 0,
      discountAmount: Math.max(0, roundCurrency(baseAmount - fixedPrice)),
      bundlePrice: fixedPrice,
    };
  }

  // Calculated mode
  const discountPercent = Math.max(0, Math.min(100, config.discountPercent ?? 0));
  const discountAmount = roundCurrency((baseAmount * discountPercent) / 100);
  const bundlePrice = Math.max(0, roundCurrency(baseAmount - discountAmount));

  return {
    pricingMode: 'CALCULATED',
    baseAmount,
    discountPercent,
    discountAmount,
    bundlePrice,
  };
}

