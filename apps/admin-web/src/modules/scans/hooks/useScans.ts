// apps/admin-web/src/modules/scans/hooks/useScans.ts
'use client';

import type { ScanListQuery } from '@mastara/contracts';

import { useAsync } from '@/shared/hooks';

import { scansApi } from '../api/scans.api';

export function useScans(query: ScanListQuery) {
  const { kind, q, page } = query;
  return useAsync(() => scansApi.listScans(query), [kind, q, page]);
}
