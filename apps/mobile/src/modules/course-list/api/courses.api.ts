// apps/mobile/src/modules/course-list/api/courses.api.ts
import type { Course } from '@mastara/contracts';
import type { StudentStream } from '@mastara/domain';

import { httpClient, isApiBreakerOpen, isOnline } from '@/core/network';
import { getLocalCatalogCoursesForScope, parseCatalogMeta } from '@/core/sync/catalogSync';

export interface CoursesApi {
  /** Courses of a semester for a stream: that stream's courses plus the COMMON ones. */
  getCourses(semesterId: string, stream: StudentStream): Promise<Course[]>;
}

type LocalizedTitle = { en?: string; am?: string };

function splitTitle(raw: string): { en: string; am?: string } {
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as LocalizedTitle;
      return { en: parsed.en || parsed.am || raw, am: parsed.am || undefined };
    } catch {
      // not JSON: use the text as it is
    }
  }
  return { en: raw };
}

/**
 * Local first. The catalog stored on the phone (bundled seed, then every sync) answers immediately with no loading
 * state and no network (SRS 5.3). The server is asked only when the phone has nothing for this semester, and only
 * briefly, so a slow or unreachable server can never hold the course list hostage.
 */
export const realCoursesApi: CoursesApi = {
  async getCourses(semesterId, stream) {
    const local = await getLocalCatalogCoursesForScope(semesterId, stream);
    if (local.length > 0) {
      return local.map((row) => {
        const title = splitTitle(row.title);
        const meta = parseCatalogMeta<{ code?: string; stream?: StudentStream | 'COMMON' }>(row.meta);
        return {
          id: row.id,
          semesterId,
          code: meta?.code ?? '',
          title: title.en,
          titleAm: title.am,
          stream: (meta?.stream ?? stream) as Course['stream'],
          isPromotional: Boolean(row.is_free),
        } as Course;
      });
    }

    if (!isOnline() || isApiBreakerOpen()) return [];

    try {
      const list = await httpClient.get<Array<Record<string, any>>>(
        `/catalog/courses?semesterId=${encodeURIComponent(semesterId)}&stream=${encodeURIComponent(stream)}`,
        { timeoutMs: 4000, retries: 0 },
      );
      return (list ?? []).map(
        (course) =>
          ({
            id: course.id,
            semesterId: course.semesterId,
            code: course.code,
            title: course.titleEn ?? course.title,
            titleAm: course.titleAm || undefined,
            stream: course.stream,
            isPromotional: course.isPromotional,
            freeTrialItems: course.freeTrialItems,
          }) as Course,
      );
    } catch {
      return [];
    }
  },
};

/** Local reads are already instant, so they are not copied into a second cache that could go stale. */
export const coursesApi: CoursesApi = realCoursesApi;
