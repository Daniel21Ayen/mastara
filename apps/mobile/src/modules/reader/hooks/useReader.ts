// apps/mobile/src/modules/reader/hooks/useReader.ts
import { canOpenContent } from '@mastara/domain';

import { contentApi } from '@/modules/courses/api/content.api';
import { myCoursesApi } from '@/modules/my-courses/api/myCourses.api';
import { useAsync } from '@/shared/hooks';

/** Loads one topic, the other topics of the same kind (for Previous/Next) and the course access. */
export function useReader(topicId: string) {
  const state = useAsync(
    topicId
      ? async () => {
          const topic = await contentApi.getTopic(topicId);
          if (!topic) return null;

          const [siblings, courses] = await Promise.all([
            contentApi.getTopics(topic.courseId, topic.kind),
            myCoursesApi.getMyCourses([topic.courseId]),
          ]);
          const access = courses[0]?.access ?? 'LOCKED';
          const index = siblings.findIndex((item) => item.id === topic.id);

          return {
            topic,
            index,
            total: siblings.length,
            previousId: siblings[index - 1]?.id,
            nextId: siblings[index + 1]?.id,
            canOpen: canOpenContent(access, topic.isFree),
          };
        }
      : null,
    [topicId],
  );

  return { data: state.data, loading: state.loading, error: state.error, reload: state.reload };
}
