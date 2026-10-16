// apps/mobile/src/modules/course-list/api/courses.api.ts
import type { Course } from '@mastara/contracts';
import type { StudentStream } from '@mastara/domain';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import { courses } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

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

function createCoursesApi(): CoursesApi {
  if (env.useMocks) return mockCoursesApi;
  throw new Error('The real courses API is added in the backend integration phase.');
}

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const coursesApi = cacheReads('courses', createCoursesApi(), ['getCourses']);
