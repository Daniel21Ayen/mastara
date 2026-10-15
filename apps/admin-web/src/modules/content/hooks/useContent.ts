// apps/admin-web/src/modules/content/hooks/useContent.ts
'use client';

import { useAsync } from '@/shared/hooks';

import { contentApi } from '../api/content.api';

export const useContentSummary = (courseId: string) =>
  useAsync(() => contentApi.getSummary(courseId), [courseId]);
export const useModules = (courseId: string) =>
  useAsync(() => contentApi.listModules(courseId), [courseId]);
export const useNotes = (courseId: string) =>
  useAsync(() => contentApi.listNotes(courseId), [courseId]);

/** Summary, modules and notes of a course together, with one reload for after any save. */
export function useMaterial(courseId: string) {
  const summary = useContentSummary(courseId);
  const modules = useModules(courseId);
  const notes = useNotes(courseId);
  return {
    summary,
    modules,
    notes,
    loading: summary.loading || modules.loading || notes.loading,
    failed: summary.error !== null || modules.error !== null || notes.error !== null,
    reload: () => {
      summary.reload();
      modules.reload();
      notes.reload();
    },
  };
}
