// apps/mobile/src/modules/courses/hooks/useCourseDetail.ts
import type { MyCourse } from '@mastara/contracts';
import { useCallback, useEffect, useState } from 'react';

import { getLocalCatalogCourses, parseCatalogMeta, parseCatalogTitle } from '@/core/sync/catalogSync';
import { isOnline } from '@/core/network';
import { myCoursesApi, realMyCoursesApi } from '@/modules/my-courses/api/myCourses.api';

/**
 * The course with its access state and progress.
 * Reads from SQLite cache first (offlineAccess checked) and renders immediately with no spinner.
 * Revalidates in the background if online.
 */
export function useCourseDetail(courseId: string) {
  const [item, setItem] = useState<MyCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadData = useCallback(async () => {
    if (!courseId) {
      setItem(null);
      setLoading(false);
      return;
    }

    try {
      // 1. Read SQLite cache immediately (with offlineAccess verification)
      const cachedList = await myCoursesApi.getMyCourses([courseId]);
      let cached = cachedList[0] ?? null;
      if (!cached) {
        const localCourses = await getLocalCatalogCourses();
        const found = localCourses.find((c) => c.id === courseId);
        if (found) {
          const meta = parseCatalogMeta<Record<string, any>>(found.meta);
          const title = parseCatalogTitle(found.title, 'en');
          cached = {
            course: {
              id: found.id,
              semesterId: meta?.semesterId ?? found.parent_id ?? '',
              code: meta?.code ?? '',
              title,
              stream: (meta?.stream ?? 'COMMON') as any,
              contentVersion: meta?.contentVersion ?? 1,
            },
            access: found.is_free === 1 || meta?.freeAccess ? 'FREE_TRIAL' : 'LOCKED',
            chaptersDone: 0,
            chaptersTotal: 0,
          };
        }
      }
      if (cached) {
        setItem(cached);
        setLoading(false);
      }

      // 2. Revalidate in background if online
      if (isOnline()) {
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
        } catch (fetchErr) {
          if (!cached) {
            throw fetchErr;
          }
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    let active = true;
    void loadData();
    return () => {
      active = false;
    };
  }, [loadData]);

  return { item, loading, error, reload: () => loadData() };
}
