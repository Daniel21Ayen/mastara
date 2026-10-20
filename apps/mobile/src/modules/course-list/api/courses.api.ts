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
    return (list ?? []).map((course) => ({
      id: course.id,
      semesterId: course.semesterId,
      code: course.code,
      title: course.title,
      stream: course.stream,
    }));
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const coursesApi = cacheReads('courses', realCoursesApi, ['getCourses']);
