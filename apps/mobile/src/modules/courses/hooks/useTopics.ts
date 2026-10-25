// apps/mobile/src/modules/courses/hooks/useTopics.ts
import type { Topic } from '@mastara/contracts';
import type { ContentKind } from '@mastara/domain';
import { useCallback, useEffect, useState } from 'react';

import { isOnline } from '@/core/network';

import { contentApi, contentRemote } from '../api/content.api';

/**
 * Reads topics from SQLite catalog first and renders immediately (no spinner when local rows exist).
 * Refreshes in the background if online (stale-while-revalidate).
 */
export function useTopics(courseId: string, kind: ContentKind) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Read local catalog first (immediate)
      const local = await contentApi.getTopics(courseId, kind);
      if (local && local.length > 0) {
        setTopics(local);
        setLoading(false);
      }

      // 2. Revalidate in background if online
      if (isOnline()) {
        try {
          const fresh = await contentRemote.getTopics(courseId, kind);
          if (Array.isArray(fresh) && fresh.length > 0) {
            setTopics((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(fresh)) {
                return fresh;
              }
              return prev;
            });
          }
        } catch (fetchErr) {
          if (!local || local.length === 0) {
            throw fetchErr;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [courseId, kind]);

  useEffect(() => {
    let active = true;
    void loadData();
    return () => {
      active = false;
    };
  }, [loadData]);

  return { topics, loading, error, reload: () => loadData() };
}
