// apps/mobile/src/modules/course-list/hooks/useCoursePicker.ts
import type { StudentStream } from '@mastara/domain';
import { useMemo, useState } from 'react';

import { useAsync } from '@/shared/hooks';

import { coursesApi } from '../api/courses.api';

export type PickerFilter = 'ALL' | 'STREAM' | 'COMMON';

interface Params {
  semesterId: string;
  stream: StudentStream;
}

export function useCoursePicker({ semesterId, stream }: Params) {
  const [filter, setFilter] = useState<PickerFilter>('ALL');
  const courses = useAsync(semesterId ? () => coursesApi.getCourses(semesterId, stream) : null, [
    semesterId,
    stream,
  ]);

  const visible = useMemo(
    () =>
      (courses.data ?? []).filter((course) => {
        if (filter === 'ALL') return true;
        return filter === 'COMMON' ? course.stream === 'COMMON' : course.stream !== 'COMMON';
      }),
    [courses.data, filter],
  );

  return { visible, filter, setFilter, loading: courses.loading, error: courses.error, reload: courses.reload };
}
