// apps/mobile/src/modules/my-courses/api/myCourses.api.ts
import type { MyCourse } from '@mastara/contracts';
import { offlineAccess } from '@mastara/domain';

import { env } from '@/core/config/env';
import { readThrough } from '@/core/db';
import { accessFor, courses, mockProgressFor } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface MyCoursesApi {
  /** The student's courses (in list order) with access state and progress. */
  getMyCourses(courseIds: readonly string[]): Promise<MyCourse[]>;
}

const mockMyCoursesApi: MyCoursesApi = {
  async getMyCourses(courseIds) {
    await simulateLatency(150);

    return courseIds.flatMap((id) => {
      const course = courses.find((item) => item.id === id);
      return course ? [{ course, ...accessFor(id), ...mockProgressFor(id) }] : [];
    });
  },
};

function createMyCoursesApi(): MyCoursesApi {
  if (env.useMocks) return mockMyCoursesApi;
  throw new Error('The real my-courses API is added in the backend integration phase.');
}

const network = createMyCoursesApi();

/**
 * Online: fresh data, saved on the phone. Offline: the saved data, but paid access is only trusted for a limited
 * grace period and until its exact saved expiry, judged with a clock a date change cannot move back (see
 * `offlineAccess` and `trustedNowMs` in the domain package).
 */
export const myCoursesApi: MyCoursesApi = {
  getMyCourses: (courseIds) =>
    readThrough(
      `my-courses.${courseIds.join(',')}`,
      () => network.getMyCourses(courseIds),
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
