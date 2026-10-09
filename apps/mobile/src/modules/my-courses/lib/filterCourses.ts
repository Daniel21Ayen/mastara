// apps/mobile/src/modules/my-courses/lib/filterCourses.ts
import type { MyCourse } from '@mastara/contracts';
import { matchesTab, progressPercent, progressState } from '@mastara/domain';
import type { AccessState, CourseTab, Stream } from '@mastara/domain';

export interface CourseFilters {
  query: string;
  tab: CourseTab;
  streams: readonly Stream[];
  access: readonly AccessState[];
}

export const EMPTY_FILTERS: CourseFilters = { query: '', tab: 'ALL', streams: [], access: [] };

export function percentOf(item: MyCourse): number {
  return progressPercent(item.chaptersDone, item.chaptersTotal);
}

/** A course must match the search text, the tab and every chosen filter group. Empty groups match all. */
export function filterCourses(items: readonly MyCourse[], filters: CourseFilters): MyCourse[] {
  const query = filters.query.trim().toLowerCase();

  return items.filter((item) => {
    if (query && !`${item.course.title} ${item.course.code}`.toLowerCase().includes(query)) return false;
    if (!matchesTab(progressState(percentOf(item)), filters.tab)) return false;
    if (filters.streams.length > 0 && !filters.streams.includes(item.course.stream)) return false;
    if (filters.access.length > 0 && !filters.access.includes(item.access)) return false;
    return true;
  });
}

export function activeFilterCount(filters: CourseFilters): number {
  return filters.streams.length + filters.access.length;
}
