// apps/admin-web/src/modules/scans/hooks/useScanOptions.ts
'use client';

import type { AdminProgram, AdminTopic } from '@mastara/contracts';
import type { Stream } from '@mastara/domain';

import { catalogApi } from '@/modules/catalog';
import { contentApi } from '@/modules/content';
import { useAsync } from '@/shared/hooks';

import { scansApi } from '../api/scans.api';

export const useUniversities = () => useAsync(() => catalogApi.listUniversities());
export const usePrograms = () => useAsync(() => catalogApi.listPrograms());

/** Courses of the chosen program, semester and stream; none until all three are chosen. */
export function useScanCourses(programId: string, semester: '' | '1' | '2', stream: Stream | '') {
  return useAsync(
    () =>
      programId && semester && stream
        ? scansApi.listCourses(programId, semester === '1' ? 1 : 2, stream)
        : Promise.resolve([]),
    [programId, semester, stream],
  );
}

/** Topics of the chosen course, as "1.2 Key terms" choices. */
export function useTopicOptions(courseId: string) {
  return useAsync(async () => {
    if (!courseId) return [] as AdminTopic[];
    const modules = await contentApi.listModules(courseId);
    return modules.flatMap((module) => module.topics);
  }, [courseId]);
}

export const programsOf = (programs: readonly AdminProgram[], universityId: string) =>
  programs.filter((program) => program.universityId === universityId);
