// apps/admin-web/src/modules/commerce/api/pricing.api.ts
import {
  getPricingSettings,
  updatePricingSettings,
  studentBirrRevenueStats,
} from '@/core/mock/data';
import type {
  PricingSettings,
  StudentBirrStats,
  StudentPaymentSummaryItem,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

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

export const pricingApi: PricingApi = mockPricingApi;
