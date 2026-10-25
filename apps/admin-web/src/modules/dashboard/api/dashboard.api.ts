// apps/admin-web/src/modules/dashboard/api/dashboard.api.ts
import { dashboardSummarySchema } from '@mastara/contracts';
import type { DashboardSummary } from '@mastara/contracts';
import { httpClient } from '@/core/network';

export interface DashboardApi {
  getSummary(): Promise<DashboardSummary>;
}

export const realDashboardApi: DashboardApi = {
  async getSummary() {
    const summary = await httpClient.get<DashboardSummary>('/dashboard/summary');
    return dashboardSummarySchema.parse(summary);
  },
};

export const dashboardApi: DashboardApi = realDashboardApi;
