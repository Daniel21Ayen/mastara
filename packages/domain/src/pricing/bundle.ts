// packages/domain/src/pricing/bundle.ts
/** Admin-managed values. These defaults come from the SRS and are replaced by server values later. */
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

export type BundleCheck = { valid: true } | { valid: false; reason: 'TOO_FEW' };

export function checkBundleSize(count: number, rules: BundleRules = DEFAULT_BUNDLE_RULES): BundleCheck {
  return count >= rules.minCourses ? { valid: true } : { valid: false, reason: 'TOO_FEW' };
}

export interface BundleQuote {
  includedCourses: number;
  extraCourses: number;
  basePrice: number;
  extrasPrice: number;
  total: number;
}

/** Price for a bundle of `count` courses: flat bundle price plus tiered extras beyond the maximum. */
export function quoteBundle(count: number, rules: BundleRules = DEFAULT_BUNDLE_RULES): BundleQuote {
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
