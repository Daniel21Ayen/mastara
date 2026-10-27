// apps/mobile/src/modules/my-courses/api/myCourses.api.ts
import type { MyCourse } from '@mastara/contracts';
import { offlineAccess } from '@mastara/domain';

import { readThrough } from '@/core/db';
import { httpClient } from '@/core/network';

export interface MyCoursesApi {
  /** The student's courses (in list order) with access state and progress. */
  getMyCourses(courseIds: readonly string[]): Promise<MyCourse[]>;
}

export const realMyCoursesApi: MyCoursesApi = {
  async getMyCourses(courseIds) {
    const list = await httpClient.get<MyCourse[]>('/learning/my-courses', { timeoutMs: 5000, retries: 0 });
    if (courseIds && courseIds.length > 0) {
      const map = new Map((list ?? []).map((item) => [item.course.id, item]));
      const filtered = courseIds.flatMap((id) => {
        const item = map.get(id);
        return item ? [item] : [];
      });
      if (filtered.length > 0) return filtered;
    }
    return list ?? [];
  },
};

/**
 * Online: fresh data, saved on the phone in SQLite. Offline: the saved data from SQLite cache,
 * but paid access is verified with offline clock rollback protection.
 */
export const myCoursesApi: MyCoursesApi = {
  getMyCourses: (courseIds) =>
    readThrough(
      `my-courses.${courseIds.join(',')}`,
      () => realMyCoursesApi.getMyCourses(courseIds),
      (saved, cachedAtMs, nowMs) =>
        saved.map(({ daysLeft, expiresAt, ...rest }) => ({
          ...rest,
          ...offlineAccess(
            {
              access: rest.access,
              expiresAtMs: expiresAt ? Date.parse(expiresAt) : undefined,
              daysLeft,
              cachedAtMs,
            },
            nowMs,
          ),
        })),
    ),
};
