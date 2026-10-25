// apps/mobile/src/modules/my-courses/hooks/useMyCourses.ts
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

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
    let list = await myCoursesApi.getMyCourses(courseIds);

    // If student list is empty (clean install, first launch, or empty My Course List) and academic scope exists:
    if ((!list || list.length === 0) && profile?.semesterId) {
      try {
        const inScopeCourses = await coursesApi.getCourses(profile.semesterId, profile.stream);
        if (inScopeCourses && inScopeCourses.length > 0) {
          list = inScopeCourses.map((c: any) => ({
            course: {
              id: c.id,
              semesterId: c.semesterId,
              code: c.code,
              title: c.title,
              stream: c.stream,
            },
            access: c.isPromotional || (c.freeTrialItems && c.freeTrialItems > 0) ? 'FREE_TRIAL' : 'LOCKED',
            chaptersDone: 0,
            chaptersTotal: 0,
          }));
        }
      } catch {
        // Fall back to whatever was returned
      }
    }

    return list ?? [];
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
