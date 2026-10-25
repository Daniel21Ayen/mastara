// apps/mobile/src/modules/course-list/api/courses.api.ts
import type { Course } from '@mastara/contracts';
import type { StudentStream } from '@mastara/domain';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

import { getLocalCatalogCourses, parseCatalogMeta } from '@/core/sync/catalogSync';

export interface CoursesApi {
  /** Courses of a semester for a stream: that stream's courses plus the COMMON ones. */
  getCourses(semesterId: string, stream: StudentStream): Promise<Course[]>;
}

export const realCoursesApi: CoursesApi = {
  async getCourses(semesterId, stream) {
    try {
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
    } catch (err) {
      // Fall back to local catalog if remote API is down or unreachable
      const localCourses = await getLocalCatalogCourses();
      if (localCourses && localCourses.length > 0) {
        return localCourses.map((c) => {
          let title = { en: c.title, am: c.title };
          if (c.title && c.title.startsWith('{')) {
            try {
              const parsed = JSON.parse(c.title);
              title = { en: parsed.en || c.title, am: parsed.am || parsed.en || c.title };
            } catch {
              // ignore
            }
          }
          const meta = parseCatalogMeta<{
            semesterId?: string;
            code?: string;
            stream?: StudentStream;
            isPromotional?: boolean;
            freeTrialItems?: number;
          }>(c.meta);

          return {
            id: c.id,
            semesterId: meta?.semesterId ?? semesterId,
            code: meta?.code ?? '',
            title,
            stream: (meta?.stream ?? stream) as StudentStream,
            isPromotional: meta?.isPromotional ?? false,
            freeTrialItems: meta?.freeTrialItems ?? 0,
          };
        });
      }
      return [];
    }
  },
};

/** Reads are saved in SQLite cache and used when the phone is offline. */
export const coursesApi = cacheReads('courses', realCoursesApi, ['getCourses']);
