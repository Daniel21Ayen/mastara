import type { CocSet } from '@mastara/contracts';
import { canOpenContent } from '@mastara/domain';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/core/session';
import { myCoursesApi } from '@/modules/my-courses/api/myCourses.api';
import { useAsync } from '@/shared/hooks';

import { cocApi } from '../api/coc.api';

/** True when at least one of the student's courses is paid: the full COC pool opens. Otherwise only the sample set. */
async function hasPaidCourse(courseIds: readonly string[]): Promise<boolean> {
  const courses = await myCoursesApi.getMyCourses(courseIds);
  return courses.some((course) => course.access === 'PAID');
}

import { isOnline } from '@/core/network';
import { realCocApi } from '../api/coc.api';

export function useCocSets() {
  const { profile } = useSession();
  const courseIds = profile?.courseIds ?? [];
  const [sets, setSets] = useState<CocSet[]>([]);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Read local catalog + cached access immediately
      const [localSets, isPaid] = await Promise.all([
        cocApi.getSets(courseIds),
        hasPaidCourse(courseIds),
      ]);
      setPaid(isPaid);
      if (localSets && localSets.length > 0) {
        setSets(localSets);
        setLoading(false);
      }

      // 2. Revalidate in background if online
      if (isOnline()) {
        try {
          const freshSets = await realCocApi.getSets(courseIds);
          if (Array.isArray(freshSets) && freshSets.length > 0) {
            setSets((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(freshSets)) {
                return freshSets;
              }
              return prev;
            });
          }
        } catch (fetchErr) {
          if (!localSets || localSets.length === 0) {
            throw fetchErr;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [courseIds.join(',')]);

  useEffect(() => {
    let active = true;
    void loadData();
    return () => {
      active = false;
    };
  }, [loadData]);

  return {
    sets,
    paid,
    hasCourses: courseIds.length > 0,
    courseIds,
    loading,
    error,
    reload: () => loadData(),
  };
}

export function useCocSession(setId: string) {
  const { profile } = useSession();
  const courseIds = profile?.courseIds ?? [];

  const state = useAsync(
    setId
      ? async () => {
          const [session, paid] = await Promise.all([cocApi.getSession(setId, courseIds), hasPaidCourse(courseIds)]);
          return session ? { ...session, canOpen: canOpenContent(paid ? 'PAID' : 'FREE_TRIAL', session.set.isFree) } : null;
        }
      : null,
    [setId, courseIds.join(',')],
  );

  return { data: state.data, loading: state.loading, error: state.error, reload: state.reload };
}
