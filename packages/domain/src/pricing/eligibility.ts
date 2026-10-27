// packages/domain/src/pricing/eligibility.ts
import type { AccessState } from '../constants/learning';
import { RENEWAL_WINDOW_DAYS } from '../constants/commerce';
import type { ProductType } from '../constants/commerce';

/**
 * A course already paid for cannot be bought again until it is within the renewal window.
 * Free-trial and locked (expired) courses can always be bought.
 */
export function canBuyCourse(
  access: AccessState,
  daysLeft: number | undefined,
  renewalWindowDays: number = RENEWAL_WINDOW_DAYS,
): boolean {
  if (access !== 'PAID') return true;
  return daysLeft !== undefined && daysLeft <= renewalWindowDays;
}

export type SingleCoursePurchaseRejectionReason =
  | 'SINGLE_COURSES_DISABLED'
  | 'BUNDLE_REQUIRED'
  | 'ALREADY_IN_BUNDLE'
  | 'COURSE_ALREADY_OWNED';

export interface CanPurchaseSingleCourseParams {
  /** True if student owns an active bundle (batch, semester, or full course). PUR-02, PUR-10 */
  hasActiveBundle: boolean;
  /** True if course is already included in the active bundle. PUR-07 */
  isCourseInBundle: boolean;
  /** True if course was already purchased separately and is currently active. PUR-05 */
  isCourseAlreadyOwned?: boolean;
  /** Global platform toggle set by Super Admin (default true). PUR-08 */
  singleCoursesEnabled?: boolean;
}

export interface EligibilityResult {
  allowed: boolean;
  reason?: SingleCoursePurchaseRejectionReason;
  message?: string;
}

/**
 * Checks whether a student is eligible to buy a single course.
 * Requirements: PUR-01, PUR-02, PUR-03, PUR-05, PUR-06, PUR-07, PUR-08.
 */
export function canPurchaseSingleCourse(params: CanPurchaseSingleCourseParams): EligibilityResult {
  const {
    hasActiveBundle,
    isCourseInBundle,
    isCourseAlreadyOwned = false,
    singleCoursesEnabled = true,
  } = params;

  if (!singleCoursesEnabled) {
    return {
      allowed: false,
      reason: 'SINGLE_COURSES_DISABLED',
      message: 'Single course purchases are currently disabled by administration.',
    };
  }

  if (!hasActiveBundle) {
    return {
      allowed: false,
      reason: 'BUNDLE_REQUIRED',
      message: 'Buy a semester or full bundle first to unlock single courses.',
    };
  }

  if (isCourseInBundle) {
    return {
      allowed: false,
      reason: 'ALREADY_IN_BUNDLE',
      message: 'This course is already included in your active bundle.',
    };
  }

  if (isCourseAlreadyOwned) {
    return {
      allowed: false,
      reason: 'COURSE_ALREADY_OWNED',
      message: 'You already own this course.',
    };
  }

  return { allowed: true };
}

/**
 * Returns true if the product type qualifies as a bundle that unlocks single course eligibility.
 * Requirements: PUR-01, PUR-10 (batch, semester, full course bundles).
 */
export function isBundleProductType(type: ProductType | string): boolean {
  return type === 'BUNDLE' || type === 'FULL_STREAM' || type === 'FULL_BOTH';
}

export interface ValidateOrderEligibilityParams {
  productType: ProductType | string;
  hasActiveBundle: boolean;
  isUnregisteredLocal: boolean;
  courseIds: string[];
  bundleCourseIds?: string[];
  ownedCourseIds?: string[];
  singleCoursesEnabled?: boolean;
}

/**
 * Evaluates whether an incoming order can be accepted by the API.
 * Requirements: PUR-01 to PUR-05.
 */
export function validateOrderEligibility(params: ValidateOrderEligibilityParams): EligibilityResult {
  const {
    productType,
    hasActiveBundle,
    isUnregisteredLocal,
    courseIds,
    bundleCourseIds = [],
    ownedCourseIds = [],
    singleCoursesEnabled = true,
  } = params;

  const isBundle = isBundleProductType(productType);

  // PUR-04: Single-course payment shall never create a new student.
  // First purchase must be a bundle for unregistered local users.
  if (isUnregisteredLocal && !isBundle) {
    return {
      allowed: false,
      reason: 'BUNDLE_REQUIRED',
      message: 'Your first purchase must be a bundle (batch, semester, or full course).',
    };
  }

  // Single course purchase rules
  if (!isBundle) {
    if (!singleCoursesEnabled) {
      return {
        allowed: false,
        reason: 'SINGLE_COURSES_DISABLED',
        message: 'Single course purchases are currently disabled.',
      };
    }

    if (!hasActiveBundle) {
      return {
        allowed: false,
        reason: 'BUNDLE_REQUIRED',
        message: 'You must have an active bundle to purchase extra single courses.',
      };
    }

    const bundleSet = new Set(bundleCourseIds);
    for (const cId of courseIds) {
      if (bundleSet.has(cId)) {
        return {
          allowed: false,
          reason: 'ALREADY_IN_BUNDLE',
          message: `Course ${cId} is already included in your active bundle.`,
        };
      }
    }

    const ownedSet = new Set(ownedCourseIds);
    for (const cId of courseIds) {
      if (ownedSet.has(cId)) {
        return {
          allowed: false,
          reason: 'COURSE_ALREADY_OWNED',
          message: `Course ${cId} is already owned.`,
        };
      }
    }
  }

  return { allowed: true };
}
