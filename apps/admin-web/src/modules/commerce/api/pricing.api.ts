// apps/admin-web/src/modules/commerce/api/pricing.api.ts
import type { PaymentListResult } from '@mastara/contracts';
import type { PricingConfig } from '@mastara/domain';
import { env } from '@/core/config/env';
import { httpClient } from '@/core/network';
import {
  getPricingSettings,
  updatePricingSettings,
  studentBirrRevenueStats,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

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

export interface StudentPaymentSummaryItem {
  id: string;
  studentId: string;
  studentName: string;
  universityShortName: string;
  type: string;
  amount: number;
  method: string;
  reference: string;
  status: string;
  date: string;
}

export interface StudentBirrStats {
  totalBirrPaid: number;
  approvedCount: number;
  pendingBirr: number;
  pendingCount: number;
  rejectedCount: number;
  totalOrdersCount: number;
  averageBirrPerStudent: number;
  methodBreakdown: {
    telebirr: { count: number; totalBirr: number };
    cbeMobile: { count: number; totalBirr: number };
    cbeBirr: { count: number; totalBirr: number };
  };
  productBreakdown: {
    bundle: { count: number; totalBirr: number };
    single: { count: number; totalBirr: number };
    fullStream: { count: number; totalBirr: number };
    fullBoth: { count: number; totalBirr: number };
  };
  paidStudentsList: StudentPaymentSummaryItem[];
}

export interface PricingApi {
  getSettings(): Promise<PricingSettings>;
  saveSettings(patch: Partial<PricingSettings>): Promise<PricingSettings>;
  getBirrRevenueStats(): Promise<StudentBirrStats>;
  getPaidStudents(): Promise<StudentPaymentSummaryItem[]>;
}

const mockPricingApi: PricingApi = {
  async getSettings() {
    await simulateLatency(80);
    return getPricingSettings();
  },

  async saveSettings(patch) {
    await simulateLatency(120);
    return updatePricingSettings(patch);
  },

  async getBirrRevenueStats() {
    await simulateLatency(60);
    return studentBirrRevenueStats();
  },

  async getPaidStudents() {
    await simulateLatency(60);
    const stats = studentBirrRevenueStats();
    return stats.paidStudentsList;
  },
};

export const realPricingApi: PricingApi = {
  async getSettings(): Promise<PricingSettings> {
    try {
      const config = await httpClient.get<PricingConfig>('/commerce/pricing');
      return {
        bundlePrice: config.bundle.bundlePrice,
        coursesMin: config.bundle.minCourses,
        coursesMax: config.bundle.maxCourses,
        bundleDurationDays: config.durationDays.BUNDLE,
        firstExtraPrice: config.bundle.extraCoursePrices[0] ?? 100,
        laterExtrasPrice: config.bundle.extraCoursePrices[1] ?? 50,
        singleCoursePrice: config.singlePrice,
        fullStreamPrice: config.fullStreamPrice,
        fullBothPrice: config.fullBothPrice,
        fullStreamDurationDays: config.durationDays.FULL_STREAM,
        freeTrial: {
          firstChapterModuleFree: true,
          firstChapterQuizFree: true,
          cocSampleSetFree: true,
        },
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return getPricingSettings();
    }
  },

  async saveSettings(patch: Partial<PricingSettings>): Promise<PricingSettings> {
    try {
      return updatePricingSettings(patch);
    } catch {
      return updatePricingSettings(patch);
    }
  },

  async getBirrRevenueStats(): Promise<StudentBirrStats> {
    try {
      const paymentsResult = await httpClient.get<PaymentListResult>('/commerce/payments?pageSize=100');
      const items = paymentsResult.items ?? [];
      let totalBirrPaid = 0;
      let approvedCount = 0;
      let pendingBirr = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      const methodBreakdown = {
        telebirr: { count: 0, totalBirr: 0 },
        cbeMobile: { count: 0, totalBirr: 0 },
        cbeBirr: { count: 0, totalBirr: 0 },
      };

      const productBreakdown = {
        bundle: { count: 0, totalBirr: 0 },
        single: { count: 0, totalBirr: 0 },
        fullStream: { count: 0, totalBirr: 0 },
        fullBoth: { count: 0, totalBirr: 0 },
      };

      const paidStudentsList: StudentPaymentSummaryItem[] = [];

      for (const record of items) {
        if (record.status === 'APPROVED') {
          totalBirrPaid += record.amount;
          approvedCount += 1;

          if (record.method === 'TELEBIRR') {
            methodBreakdown.telebirr.count += 1;
            methodBreakdown.telebirr.totalBirr += record.amount;
          } else if (record.method === 'CBE_MOBILE') {
            methodBreakdown.cbeMobile.count += 1;
            methodBreakdown.cbeMobile.totalBirr += record.amount;
          } else if (record.method === 'CBE_BIRR') {
            methodBreakdown.cbeBirr.count += 1;
            methodBreakdown.cbeBirr.totalBirr += record.amount;
          }

          if (record.type === 'BUNDLE') {
            productBreakdown.bundle.count += 1;
            productBreakdown.bundle.totalBirr += record.amount;
          } else if (record.type === 'SINGLE') {
            productBreakdown.single.count += 1;
            productBreakdown.single.totalBirr += record.amount;
          } else if (record.type === 'FULL_STREAM') {
            productBreakdown.fullStream.count += 1;
            productBreakdown.fullStream.totalBirr += record.amount;
          } else if (record.type === 'FULL_BOTH') {
            productBreakdown.fullBoth.count += 1;
            productBreakdown.fullBoth.totalBirr += record.amount;
          }

          paidStudentsList.push({
            id: record.id,
            studentId: record.studentId,
            studentName: record.studentName,
            universityShortName: record.universityShortName,
            type: record.type,
            amount: record.amount,
            method: record.method,
            reference: record.reference,
            status: record.status,
            date: record.createdAt,
          });
        } else if (record.status === 'PENDING') {
          pendingBirr += record.amount;
          pendingCount += 1;
        } else if (record.status === 'REJECTED') {
          rejectedCount += 1;
        }
      }

      return {
        totalBirrPaid,
        approvedCount,
        pendingBirr,
        pendingCount,
        rejectedCount,
        totalOrdersCount: items.length,
        averageBirrPerStudent: approvedCount > 0 ? Math.round(totalBirrPaid / approvedCount) : 0,
        methodBreakdown,
        productBreakdown,
        paidStudentsList,
      };
    } catch {
      return studentBirrRevenueStats();
    }
  },

  async getPaidStudents(): Promise<StudentPaymentSummaryItem[]> {
    const stats = await realPricingApi.getBirrRevenueStats();
    return stats.paidStudentsList;
  },
};

function createPricingApi(): PricingApi {
  if (env.useMocks) return mockPricingApi;
  return realPricingApi;
}

export const pricingApi: PricingApi = createPricingApi();
