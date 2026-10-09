// apps/mobile/src/modules/exams/hooks/useExams.ts
import type { ExamKind } from '@mastara/domain';

import { useSession } from '@/core/session';
import { useAsync } from '@/shared/hooks';

import { examApi } from '../api/exam.api';

/** Exams of one kind for a course. The student's own university is listed first. */
export function useExams(courseId: string, kind: ExamKind) {
  const { profile } = useSession();
  const home = profile?.universityId;

  const state = useAsync(async () => {
    const listings = await examApi.getExams(courseId, kind);
    return [...listings].sort(
      (a, b) => Number(b.university.id === home) - Number(a.university.id === home),
    );
  }, [courseId, kind, home]);

  return { items: state.data ?? [], loading: state.loading, error: state.error, reload: state.reload };
}
