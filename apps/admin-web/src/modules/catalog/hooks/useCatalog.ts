// apps/admin-web/src/modules/catalog/hooks/useCatalog.ts
'use client';

import type { CourseListQuery } from '@mastara/contracts';

import { useAsync } from '@/shared/hooks';

import { catalogApi } from '../api/catalog.api';

export function useCourses(query: CourseListQuery) {
  const { q, universityId, programId, semesterNumber, stream, status, page } = query;
  return useAsync(
    () => catalogApi.listCourses(query),
    [q, universityId, programId, semesterNumber, stream, status, page],
  );
}

export const useUniversities = () => useAsync(() => catalogApi.listUniversities());
export const usePrograms = () => useAsync(() => catalogApi.listPrograms());
export const useSemesters = () => useAsync(() => catalogApi.listSemesters());
