// apps/mobile/src/modules/quizzes/hooks/usePracticeData.ts
import { canOpenContent } from '@mastara/domain';

import { myCoursesApi } from '@/modules/my-courses/api/myCourses.api';
import { useAsync } from '@/shared/hooks';

import { quizApi } from '../api/quiz.api';

/** Loads a chapter, its questions and whether the student's access covers it. */
export function usePracticeData(chapterId: string) {
  const state = useAsync(
    chapterId
      ? async () => {
          const chapter = await quizApi.getChapter(chapterId);
          if (!chapter) return null;

          const [questions, courses] = await Promise.all([
            quizApi.getQuestions(chapterId),
            myCoursesApi.getMyCourses([chapter.courseId]),
          ]);
          const access = courses[0]?.access ?? 'LOCKED';

          return { chapter, questions, canOpen: canOpenContent(access, chapter.isFree) };
        }
      : null,
    [chapterId],
  );

  return { data: state.data, loading: state.loading, error: state.error, reload: state.reload };
}
