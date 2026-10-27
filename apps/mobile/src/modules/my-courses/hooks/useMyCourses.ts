// apps/mobile/src/modules/my-courses/hooks/useMyCourses.ts
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { httpClient } from '@/core/network';
import { useSession } from '@/core/session';
import { coursesApi } from '@/modules/course-list';
import { useAsync } from '@/shared/hooks';
import type { MyCourse } from '@mastara/contracts';

import { myCoursesApi } from '../api/myCourses.api';
import { activeFilterCount, EMPTY_FILTERS, filterCourses } from '../lib/filterCourses';
import type { CourseFilters } from '../lib/filterCourses';

/** Loads the student's courses and applies search, tab and filters. */
export function useMyCourses() {
  const { profile } = useSession();
  const courseIds = profile?.courseIds ?? [];
  const [filters, setFilters] = useState<CourseFilters>(EMPTY_FILTERS);

  const courses = useAsync(async (): Promise<MyCourse[]> => {
    // 1. Instant and offline-safe: the courses of the student's semester and stream from the catalog on the phone.
    let local: MyCourse[] = [];
    if (profile?.semesterId) {
      const inScope = await coursesApi.getCourses(profile.semesterId, profile.stream);
      const wanted = new Set(courseIds);
      local = inScope
        .filter((c) => wanted.size === 0 || wanted.has(c.id))
        .map((c: any) => ({
          course: {
            id: c.id,
            semesterId: c.semesterId,
            code: c.code,
            title: c.title,
            titleAm: c.titleAm,
            stream: c.stream,
          },
          access: c.isPromotional || (c.freeTrialItems && c.freeTrialItems > 0) ? 'FREE_TRIAL' : 'LOCKED',
          chaptersDone: 0,
          chaptersTotal: 0,
        }));
    }

    // 2. Students who have not made their first purchase have no server account and no token (SRS 6.1):
    // there is nothing to ask the server, so do not wait on it.
    if (!(await httpClient.getToken())) return local;

    // 3. Registered students: paid access and progress from the server replace the local guess, course by course.
    try {
      const remote = await myCoursesApi.getMyCourses(courseIds);
      if (!remote || remote.length === 0) return local;
      const byId = new Map(local.map((item) => [item.course.id, item]));
      for (const item of remote) byId.set(item.course.id, item);
      return [...byId.values()];
    } catch {
      return local;
    }
  }, [courseIds.join(','), profile?.semesterId, profile?.stream]);

  const { reload } = courses;
  useFocusEffect(useCallback(() => reload(), [reload]));
  const visible = useMemo(() => filterCourses(courses.data ?? [], filters), [courses.data, filters]);

  return {
    filters,
    setFilters,
    visible,
    total: courses.data?.length ?? 0,
    activeFilters: activeFilterCount(filters),
    loading: courses.loading,
    error: courses.error,
    reload: courses.reload,
    clearFilters: () => setFilters((prev) => ({ ...EMPTY_FILTERS, tab: prev.tab, query: prev.query })),
  };
}
