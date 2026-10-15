// apps/admin-web/src/modules/tests/hooks/useTests.ts
'use client';

import type { QuestionListQuery } from '@mastara/contracts';

import { useAsync } from '@/shared/hooks';

import { testsApi } from '../api/tests.api';

export const useTestsOverview = (courseId: string) =>
  useAsync(() => testsApi.getOverview(courseId), [courseId]);

export function useQuestions(query: QuestionListQuery) {
  const { quizNo, courseId, form, status, q, page } = query;
  return useAsync(() => testsApi.listQuestions(query), [quizNo, courseId, form, status, q, page]);
}

export const useQuestion = (id: string) => useAsync(() => testsApi.getQuestion(id), [id]);
