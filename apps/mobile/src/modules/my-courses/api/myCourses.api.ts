// apps/mobile/src/modules/my-courses/api/myCourses.api.ts
import type { MyCourse } from '@mastara/contracts';
import { offlineAccess } from '@mastara/domain';

import { readThrough } from '@/core/db';
import { httpClient } from '@/core/network';

export interface MyCoursesApi {
  /** The student's courses (in list order) with access state and progress. */
  getMyCourses(courseIds: readonly string[]): Promise<MyCourse[]>;
}

const realMyCoursesApi: MyCoursesApi = {
  async getMyCourses(_courseIds) {
    return httpClient.get<MyCourse[]>('/learning/my-courses');
  },
};

/**
 * Online: fresh data, saved on the phone. Offline: the saved data, but paid access is only trusted for a limited
 * grace period and until its exact saved expiry, judged with a clock a date change cannot move back (see
 * `offlineAccess` and `trustedNowMs` in the domain package).
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
