// apps/admin-web/src/modules/dashboard/api/dashboard.api.ts
import { dashboardSummarySchema } from '@mastara/contracts';
import type { DashboardSummary } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { buildDashboardSummary } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

import { httpClient } from '@/core/network';

export interface DashboardApi {
  getSummary(): Promise<DashboardSummary>;
}

const mockDashboardApi: DashboardApi = {
  async getSummary() {
    await simulateLatency();
    return dashboardSummarySchema.parse(buildDashboardSummary());
  },
};

export const realDashboardApi: DashboardApi = {
  async getSummary() {
    const summary = await httpClient.get<DashboardSummary>('/dashboard/summary');
    return dashboardSummarySchema.parse(summary);
  },
};

function createDashboardApi(): DashboardApi {
  if (env.useMocks) return mockDashboardApi;
  return realDashboardApi;
}

export const dashboardApi = createDashboardApi();
