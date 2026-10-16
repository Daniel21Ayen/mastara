// apps/admin-web/src/modules/students/hooks/useStudents.ts
'use client';

import type { StudentListQuery } from '@mastara/contracts';

import { useAsync } from '@/shared/hooks';

import { studentsApi } from '../api/students.api';

export function useStudents(query: StudentListQuery) {
  const { q, universityId, stream, access, page } = query;
  return useAsync(() => studentsApi.list(query), [q, universityId, stream, access, page]);
}

export function useStudent(id: string) {
  return useAsync(() => studentsApi.get(id), [id]);
}

export function useStudentOptions() {
  return useAsync(() => studentsApi.getOptions());
}
