import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useSession } from '@/core/session';
import { useAsync } from '@/shared/hooks';

import { myCoursesApi } from '../api/myCourses.api';
import { activeFilterCount, EMPTY_FILTERS, filterCourses } from '../lib/filterCourses';
import type { CourseFilters } from '../lib/filterCourses';

/** Loads the student's courses and applies search, tab and filters. */
export function useMyCourses() {
  const { profile } = useSession();
  const courseIds = profile?.courseIds ?? [];
  const [filters, setFilters] = useState<CourseFilters>(EMPTY_FILTERS);

  const courses = useAsync(() => myCoursesApi.getMyCourses(courseIds), [courseIds.join(',')]);
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
