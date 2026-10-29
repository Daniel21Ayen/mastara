// packages/domain/src/pricing/quote.ts
import type { ProductType } from '../constants/commerce';

import type { BundleRules } from './bundle';
import { DEFAULT_BUNDLE_RULES, roundCurrency } from './bundle';

/** Everything the Admin can change about prices. The server sends the live values. */
export interface PricingConfig {
  bundle: BundleRules;
  singlePrice: number;
  fullStreamPrice: number;
  fullBothPrice: number;
  durationDays: Record<ProductType, number>;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  bundle: DEFAULT_BUNDLE_RULES,
  singlePrice: 60,
  fullStreamPrice: 350,
  fullBothPrice: 700,
  durationDays: { BUNDLE: 150, SINGLE: 150, FULL_STREAM: 365, FULL_BOTH: 365 },
};

export type OrderInput =
  | { type: 'BUNDLE'; courseCount: number }
  | { type: 'SINGLE' }
  | { type: 'FULL_STREAM' }
  | { type: 'FULL_BOTH' };

export interface QuoteLine {
  kind: 'BUNDLE' | 'EXTRA' | 'SINGLE' | 'FULL_STREAM' | 'FULL_BOTH';
  /** Courses this line covers (1 for each extra course). */
  count: number;
  amount: number;
}

export interface OrderQuote {
  lines: QuoteLine[];
  total: number;
}

export type QuoteResult =
  | { ok: true; quote: OrderQuote }
  | { ok: false; error: 'BUNDLE_COUNT_INVALID' };

function single(kind: QuoteLine['kind'], amount: number): QuoteResult {
  return { ok: true, quote: { lines: [{ kind, count: 0, amount }], total: amount } };
}

/**
 * Prices an order from the live config. The client uses it for display only;
 * the server runs the same function and its answer is the one that is charged.
 */
export function quoteOrder(config: PricingConfig, input: OrderInput): QuoteResult {
  switch (input.type) {
    case 'SINGLE':
      return { ok: true, quote: { lines: [{ kind: 'SINGLE', count: 1, amount: config.singlePrice }], total: config.singlePrice } };
    case 'FULL_STREAM':
      return single('FULL_STREAM', config.fullStreamPrice);
    case 'FULL_BOTH':
      return single('FULL_BOTH', config.fullBothPrice);
    case 'BUNDLE': {
      const { bundlePrice, minCourses, maxCourses, extraCoursePrices } = config.bundle;
      if (input.courseCount < minCourses) return { ok: false, error: 'BUNDLE_COUNT_INVALID' };

      const lines: QuoteLine[] = [
        { kind: 'BUNDLE', count: Math.min(input.courseCount, maxCourses), amount: bundlePrice },
      ];
      const lastTier = extraCoursePrices[extraCoursePrices.length - 1] ?? 0;
      for (let i = 0; i < input.courseCount - maxCourses; i += 1) {
        lines.push({ kind: 'EXTRA', count: 1, amount: extraCoursePrices[i] ?? lastTier });
      }
      return { ok: true, quote: { lines, total: roundCurrency(lines.reduce((sum, line) => sum + line.amount, 0)) } };
    }
  }
}

// ============================================================================
// Consolidated Requirements (v1.0): Extra Course Count-Based Tier Pricing
// ============================================================================

export interface ExtraCourseTier {
  fromOrdinal: number; // 1-indexed, e.g. 1, 2, 6
  toOrdinal?: number; // e.g. 1, 5, or undefined for open-ended tier
  priceETB: number; // admin-defined unit price for this band
}

export interface ExtraCoursePriceResult {
  total: number;
  lines: Array<{
    ordinal: number;
    priceETB: number;
    tierFrom: number;
    tierTo?: number;
  }>;
}

/**
 * Calculates extra single-course pricing based on ordinal position in the order.
 * Requirements: Section 4.4 & Section 11 (calculateExtraCoursePrice).
 * Example: 7 extra courses under [1-1: 100, 2-5: 50, 6+: 40]
 *   Total = 1x100 + 4x50 + 2x40 = 380 ETB
 */
export function calculateExtraCoursePrice(
  extraCourseCount: number,
  tiers: readonly ExtraCourseTier[],
): ExtraCoursePriceResult {
  if (extraCourseCount <= 0) {
    return { total: 0, lines: [] };
  }
  if (!tiers || tiers.length === 0) {
    throw new Error('At least one extra course tier must be configured by admin');
  }

  const sorted = [...tiers].sort((a, b) => a.fromOrdinal - b.fromOrdinal);

  const lines: ExtraCoursePriceResult['lines'] = [];
  let total = 0;

  for (let ordinal = 1; ordinal <= extraCourseCount; ordinal += 1) {
    const tier = sorted.find((t) => {
      if (ordinal < t.fromOrdinal) return false;
      if (t.toOrdinal != null && ordinal > t.toOrdinal) return false;
      return true;
    });

    if (!tier) {
      throw new Error(`No pricing tier found covering extra course ordinal #${ordinal}`);
    }

    total = roundCurrency(total + tier.priceETB);
    lines.push({
      ordinal,
      priceETB: tier.priceETB,
      tierFrom: tier.fromOrdinal,
      tierTo: tier.toOrdinal,
    });
  }

  return { total, lines };
}

