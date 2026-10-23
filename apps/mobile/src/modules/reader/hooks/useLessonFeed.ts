// apps/mobile/src/modules/reader/hooks/useLessonFeed.ts
import type { Topic } from '@mastara/contracts';
import { canOpenContent } from '@mastara/domain';

import { contentApi } from '@/modules/courses/api/content.api';
import { myCoursesApi } from '@/modules/my-courses/api/myCourses.api';
import { useAsync } from '@/shared/hooks';

export interface LessonEntry {
  topic: Topic;
  /** Free-trial items and paid courses open; the rest show a lock. */
  canOpen: boolean;
}

/**
 * The lesson the student tapped plus every other lesson of the same course and kind, in order, so the reader can
 * scroll through them one after another. Also tells whether each one is open for this student.
 */
export function useLessonFeed(topicId: string) {
  const state = useAsync(
    topicId
      ? async () => {
          const first = await contentApi.getTopic(topicId);
          if (!first) return null;

          const [siblings, courses] = await Promise.all([
            contentApi.getTopics(first.courseId, first.kind),
            myCoursesApi.getMyCourses([first.courseId]),
          ]);
          const access = courses[0]?.access ?? 'LOCKED';
          const lessons: LessonEntry[] = siblings.map((topic) => ({
            topic,
            canOpen: canOpenContent(access, topic.isFree),
          }));
          const startIndex = Math.max(
            0,
            lessons.findIndex((entry) => entry.topic.id === first.id),
          );
          return { lessons, startIndex, first };
        }
      : null,
    [topicId],
  );

  return { data: state.data, loading: state.loading, error: state.error, reload: state.reload };
}
