// apps/mobile/src/modules/courses/hooks/useCourseDetail.ts
import { myCoursesApi } from '@/modules/my-courses';
import { useAsync } from '@/shared/hooks';

/** The course with its access state and progress, or null if it is not in the student's list. */
export function useCourseDetail(courseId: string) {
  const state = useAsync(
    courseId ? async () => (await myCoursesApi.getMyCourses([courseId]))[0] ?? null : null,
    [courseId],
  );

  return { item: state.data, loading: state.loading, error: state.error, reload: state.reload };
}
