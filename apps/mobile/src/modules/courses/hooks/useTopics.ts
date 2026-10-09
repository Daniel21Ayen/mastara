// apps/mobile/src/modules/courses/hooks/useTopics.ts
import type { ContentKind } from '@mastara/domain';

import { useAsync } from '@/shared/hooks';

import { contentApi } from '../api/content.api';

export function useTopics(courseId: string, kind: ContentKind) {
  const state = useAsync(() => contentApi.getTopics(courseId, kind), [courseId, kind]);
  return { topics: state.data ?? [], loading: state.loading, error: state.error, reload: state.reload };
}
