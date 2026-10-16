// apps/admin-web/src/modules/dashboard/hooks/useDashboard.ts
'use client';

import { useAsync } from '@/shared/hooks';

import { dashboardApi } from '../api/dashboard.api';

export function useDashboard() {
  return useAsync(() => dashboardApi.getSummary());
}
