// apps/mobile/src/modules/coc/hooks/useCocData.ts
import { canOpenContent } from '@mastara/domain';

import { useSession } from '@/core/session';
import { myCoursesApi } from '@/modules/my-courses/api/myCourses.api';
import { useAsync } from '@/shared/hooks';

import { cocApi } from '../api/coc.api';

/** True when at least one of the student's courses is paid: the full COC pool opens. Otherwise only the sample set. */
async function hasPaidCourse(courseIds: readonly string[]): Promise<boolean> {
  const courses = await myCoursesApi.getMyCourses(courseIds);
  return courses.some((course) => course.access === 'PAID');
}

export function useCocSets() {
  const { profile } = useSession();
  const courseIds = profile?.courseIds ?? [];

  const state = useAsync(async () => {
    const [sets, paid] = await Promise.all([cocApi.getSets(courseIds), hasPaidCourse(courseIds)]);
    return { sets, paid };
  }, [courseIds.join(',')]);

  return {
    sets: state.data?.sets ?? [],
    paid: state.data?.paid ?? false,
    hasCourses: courseIds.length > 0,
    courseIds,
    loading: state.loading,
    error: state.error,
    reload: state.reload,
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
