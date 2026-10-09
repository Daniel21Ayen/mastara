// apps/mobile/src/modules/progress/hooks/useProgress.ts
import { progressPercent } from '@mastara/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useSession } from '@/core/session';
import { examResultRepository } from '@/modules/exams';
import { myCoursesApi } from '@/modules/my-courses';
import { useAsync } from '@/shared/hooks';

/** Overall and per-course progress plus the latest exam results. Reloads when the tab regains focus. */
export function useProgress() {
  const { profile } = useSession();
  const courseIds = profile?.courseIds ?? [];

  const state = useAsync(async () => {
    const [courses, results] = await Promise.all([myCoursesApi.getMyCourses(courseIds), examResultRepository.list()]);
    const done = courses.reduce((sum, item) => sum + item.chaptersDone, 0);
    const total = courses.reduce((sum, item) => sum + item.chaptersTotal, 0);
    return { courses, results: results.slice(0, 5), done, total, percent: progressPercent(done, total) };
  }, [courseIds.join(',')]);

  const { reload } = state;
  useFocusEffect(useCallback(() => reload(), [reload]));

  return { data: state.data, loading: state.loading, error: state.error, reload };
}
