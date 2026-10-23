import type { MyCourse } from '@mastara/contracts';
import { progressPercent } from '@mastara/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useSession } from '@/core/session';
import { examResultRepository } from '@/modules/exams/repo/examResult.repository';
import type { ExamResultRecord } from '@/modules/exams/repo/examResult.repository';
import { myCoursesApi } from '@/modules/my-courses/api/myCourses.api';
import { useAsync } from '@/shared/hooks';

export interface ProgressData {
  courses: MyCourse[];
  results: ExamResultRecord[];
  done: number;
  total: number;
  percent: number;
}

/** Overall and per-course progress plus the latest exam results. Reloads when the tab regains focus. */
export function useProgress() {
  const { profile } = useSession();
  const courseIds = profile?.courseIds ?? [];

  const state = useAsync<ProgressData>(async () => {
    const [courses, results] = await Promise.all([myCoursesApi.getMyCourses(courseIds), examResultRepository.list()]);
    const done = courses.reduce((sum: number, item: MyCourse) => sum + item.chaptersDone, 0);
    const total = courses.reduce((sum: number, item: MyCourse) => sum + item.chaptersTotal, 0);
    return { courses, results: results.slice(0, 5), done, total, percent: progressPercent(done, total) };
  }, [courseIds.join(',')]);

  const { reload } = state;
  useFocusEffect(useCallback(() => reload(), [reload]));

  return { data: state.data, loading: state.loading, error: state.error, reload };
}
