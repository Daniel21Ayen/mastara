// apps/mobile/src/modules/course-list/api/courses.api.ts
import type { Course } from '@mastara/contracts';
import type { StudentStream } from '@mastara/domain';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import { courses } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient } from '@/core/network';

export interface CoursesApi {
  /** Courses of a semester for a stream: that stream's courses plus the COMMON ones. */
  getCourses(semesterId: string, stream: StudentStream): Promise<Course[]>;
}

const mockCoursesApi: CoursesApi = {
  async getCourses(semesterId, stream) {
    await simulateLatency();
    return courses.filter(
      (course) =>
        course.semesterId === semesterId && (course.stream === stream || course.stream === 'COMMON'),
    );
  },
};

export const realCoursesApi: CoursesApi = {
  async getCourses(semesterId, stream) {
    try {
      const list = await httpClient.get<Course[]>(
        `/catalog/courses?semesterId=${encodeURIComponent(semesterId)}&stream=${encodeURIComponent(stream)}`,
      );
      if (list && list.length > 0) {
        return list.map((course) => ({
          id: course.id,
          semesterId: course.semesterId,
          code: course.code,
          title: course.title,
          stream: course.stream,
        }));
      }
      return mockCoursesApi.getCourses(semesterId, stream);
    } catch {
      return mockCoursesApi.getCourses(semesterId, stream);
    }
  },
};

const baseApi: CoursesApi = env.useMocks ? mockCoursesApi : realCoursesApi;

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const coursesApi = cacheReads('courses', baseApi, ['getCourses']);
