// apps/mobile/src/modules/course-list/api/courses.api.ts
import type { Course } from '@mastara/contracts';
import type { StudentStream } from '@mastara/domain';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface CoursesApi {
  /** Courses of a semester for a stream: that stream's courses plus the COMMON ones. */
  getCourses(semesterId: string, stream: StudentStream): Promise<Course[]>;
}

export const realCoursesApi: CoursesApi = {
  async getCourses(semesterId, stream) {
    const list = await httpClient.get<Course[]>(
      `/catalog/courses?semesterId=${encodeURIComponent(semesterId)}&stream=${encodeURIComponent(stream)}`,
    );
    return (list ?? []).map((course: any) => ({
      id: course.id,
      semesterId: course.semesterId,
      code: course.code,
      title: course.title,
      stream: course.stream,
      isPromotional: course.isPromotional,
      freeTrialItems: course.freeTrialItems,
    }));
  },
};

/** Reads are saved in SQLite cache and used when the phone is offline. */
export const coursesApi = cacheReads('courses', realCoursesApi, ['getCourses']);
