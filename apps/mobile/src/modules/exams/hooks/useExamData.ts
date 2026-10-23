// apps/mobile/src/modules/exams/hooks/useExamData.ts
import { canOpenContent } from '@mastara/domain';

import { myCoursesApi } from '@/modules/my-courses/api/myCourses.api';
import { useAsync } from '@/shared/hooks';

import { examApi } from '../api/exam.api';

/** Loads an exam with its questions and whether the student's access covers it. */
export function useExamData(examId: string) {
  const state = useAsync(
    examId
      ? async () => {
          const session = await examApi.getSession(examId);
          if (!session) return null;

          const courses = await myCoursesApi.getMyCourses([session.exam.courseId]);
          const access = courses[0]?.access ?? 'LOCKED';
          return { ...session, canOpen: canOpenContent(access, session.exam.isFree) };
        }
      : null,
    [examId],
  );

  return { data: state.data, loading: state.loading, error: state.error, reload: state.reload };
}
