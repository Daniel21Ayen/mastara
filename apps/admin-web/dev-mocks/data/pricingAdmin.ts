// apps/admin-web/src/core/mock/data/pricingAdmin.ts
import { recordAudit } from './audit';

export interface FreeTrialConfig {
  firstChapterModuleFree: boolean;
  firstChapterQuizFree: boolean;
  cocSampleSetFree: boolean;
}

export interface PricingSettings {
  bundlePrice: number;
  coursesMin: number;
  coursesMax: number;
  bundleDurationDays: number;
  firstExtraPrice: number;
  laterExtrasPrice: number;
  singleCoursePrice: number;
  fullStreamPrice: number;
  fullBothPrice: number;
  fullStreamDurationDays: number;
  freeTrial: FreeTrialConfig;
  updatedAt: string;
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  bundlePrice: 200,
  coursesMin: 7,
  coursesMax: 10,
  bundleDurationDays: 150,
  firstExtraPrice: 100,
  laterExtrasPrice: 50,
  singleCoursePrice: 60,
  fullStreamPrice: 350,
  fullBothPrice: 700,
  fullStreamDurationDays: 365,
  freeTrial: {
    firstChapterModuleFree: true,
    firstChapterQuizFree: true,
    cocSampleSetFree: true,
  },
  updatedAt: new Date().toISOString(),
};

let currentPricingSettings: PricingSettings = { ...DEFAULT_PRICING_SETTINGS };

export function getPricingSettings(): PricingSettings {
  return { ...currentPricingSettings, freeTrial: { ...currentPricingSettings.freeTrial } };
}

export function updatePricingSettings(next: Partial<PricingSettings>): PricingSettings {
  currentPricingSettings = {
    ...currentPricingSettings,
    ...next,
    freeTrial: {
      ...currentPricingSettings.freeTrial,
      ...(next.freeTrial ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };

  recordAudit({
    actor: 'ADMIN',
    action: 'PRICE_CHANGED',
    target: 'Products & Pricing Settings',
    reason: `Updated product prices (Bundle: ${currentPricingSettings.bundlePrice} ETB, Freshman: ${currentPricingSettings.fullStreamPrice} ETB)`,
  });

  return getPricingSettings();
}
