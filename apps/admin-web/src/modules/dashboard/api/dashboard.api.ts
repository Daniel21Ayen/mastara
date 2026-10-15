// apps/admin-web/src/modules/dashboard/api/dashboard.api.ts
import { dashboardSummarySchema } from '@mastara/contracts';
import type { DashboardSummary } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { buildDashboardSummary } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface DashboardApi {
  getSummary(): Promise<DashboardSummary>;
}

const mockDashboardApi: DashboardApi = {
  async getSummary() {
    await simulateLatency();
    return dashboardSummarySchema.parse(buildDashboardSummary());
  },
};

function createDashboardApi(): DashboardApi {
  if (env.useMocks) return mockDashboardApi;
  throw new Error('The real dashboard API is added in the backend integration phase.');
}

export const dashboardApi = createDashboardApi();
