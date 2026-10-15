// apps/admin-web/src/modules/questions/hooks/useExamSets.ts
'use client';

import type { ExamSetListQuery } from '@mastara/contracts';

import { useAsync } from '@/shared/hooks';

import { questionsApi } from '../api/questions.api';

export function useExamSets(query: ExamSetListQuery) {
  const { kind, status, q, page } = query;
  return useAsync(() => questionsApi.listSets(query), [kind, status, q, page]);
}

/** One set for editing; with no ID (a new set) it resolves to nothing. */
export const useExamSet = (id: string | null) =>
  useAsync(() => (id ? questionsApi.getSet(id) : Promise.resolve(null)), [id]);
