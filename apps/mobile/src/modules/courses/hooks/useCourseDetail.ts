// apps/mobile/src/modules/courses/hooks/useCourseDetail.ts
import type { MyCourse } from '@mastara/contracts';
import { useCallback, useEffect, useState } from 'react';

import { getLocalCatalogCourse, getLocalCatalogCourses, parseCatalogMeta, parseCatalogTitle } from '@/core/sync/catalogSync';
import { httpClient, isOnline } from '@/core/network';
import { useSession } from '@/core/session';
import { myCoursesApi, realMyCoursesApi } from '@/modules/my-courses/api/myCourses.api';

/**
 * The course with its access state and progress.
 * Reads from SQLite cache first (offlineAccess checked) and renders immediately with no spinner.
 * Revalidates in the background if online.
 *
 * Guest users (isGuest=true or no auth token): access state is derived from the local catalog —
 * FREE_TRIAL for courses flagged is_free, LOCKED for all others. No authenticated API call is made.
 */
export function useCourseDetail(courseId: string) {
  const [item, setItem] = useState<MyCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const { user, isGuest } = useSession();

  const loadData = useCallback(async () => {
    if (!courseId) {
      setItem(null);
      setLoading(false);
      return;
    }

    try {
      // 1. Read SQLite local catalog first (instant & offline-ready)
      let cached: MyCourse | null = null;
      const localCourse = await getLocalCatalogCourse(courseId);
      if (localCourse) {
        const meta = parseCatalogMeta<Record<string, any>>(localCourse.meta);
        const title = parseCatalogTitle(localCourse.title, 'en');
        const access = localCourse.is_free === 1 || meta?.freeAccess ? 'FREE_TRIAL' : 'LOCKED';
        cached = {
          course: {
            id: localCourse.id,
            semesterId: meta?.semesterId ?? localCourse.parent_id ?? '',
            code: meta?.code ?? '',
            title,
            stream: (meta?.stream ?? 'COMMON') as any,
            contentVersion: meta?.contentVersion ?? 1,
          },
          access,
          chaptersDone: 0,
          chaptersTotal: 0,
        };
        setItem(cached);
        setLoading(false);
      }

      // 2. If authenticated, check if the student has paid access & progress from SQLite cache
      if (!isGuest && user) {
        try {
          const cachedList = await myCoursesApi.getMyCourses([courseId]);
          if (cachedList && cachedList.length > 0) {
            cached = cachedList[0] ?? null;
            if (cached) {
              setItem(cached);
              setLoading(false);
            }
          }
        } catch {
          // If myCoursesApi fails (e.g. offline or not enrolled), keep the local catalog course
        }
      }

      // 3. If still not found (e.g. course created in admin and local sync pending) and online:
      // fetch directly from the public course catalog endpoint
      if (!cached && isOnline()) {
        try {
          const remoteCourse = await httpClient.get<any>(
            `/catalog/courses/${encodeURIComponent(courseId)}`,
            { timeoutMs: 5000, retries: 0 },
          );
          if (remoteCourse && remoteCourse.id) {
            const access = remoteCourse.isPromotional || (remoteCourse.freeTrialItems && remoteCourse.freeTrialItems > 0)
              ? 'FREE_TRIAL'
              : 'LOCKED';
            cached = {
              course: {
                id: remoteCourse.id,
                semesterId: remoteCourse.semesterId ?? '',
                code: remoteCourse.code ?? '',
                title: remoteCourse.titleEn ?? remoteCourse.title ?? '',
                stream: (remoteCourse.stream ?? 'COMMON') as any,
                contentVersion: remoteCourse.contentVersion ?? 1,
              },
              access,
              chaptersDone: 0,
              chaptersTotal: 0,
            };
            setItem(cached);
            setLoading(false);
          }
        } catch (fetchErr) {
          // Ignore and continue
        }
      }

      // 4. Background revalidation for authenticated students if online
      if (!isGuest && user && isOnline()) {
        try {
          const freshList = await realMyCoursesApi.getMyCourses([courseId]);
          const fresh = freshList[0] ?? null;
          if (fresh) {
            setItem((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(fresh)) {
                return fresh;
              }
              return prev;
            });
          }
        } catch {
          // Keep cached/local item if server revalidation fails
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [courseId, isGuest, user]);

  useEffect(() => {
    let active = true;
    void loadData();
    return () => {
      active = false;
    };
  }, [loadData]);

  return { item, loading, error, reload: () => loadData() };
}
