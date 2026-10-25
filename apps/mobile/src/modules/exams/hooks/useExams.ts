// apps/mobile/src/modules/exams/hooks/useExams.ts
import type { ExamKind } from '@mastara/domain';
import { useCallback, useEffect, useState } from 'react';

import { isOnline } from '@/core/network';
import { useSession } from '@/core/session';

import { examApi, realExamApi, type ExamListing } from '../api/exam.api';

/**
 * Exams of one kind for a course. The student's own university is listed first.
 * Reads from SQLite catalog first and renders immediately (no spinner when local rows exist).
 * Refreshes in background if online (stale-while-revalidate).
 */
export function useExams(courseId: string, kind: ExamKind) {
  const { profile } = useSession();
  const home = profile?.universityId;
  const [items, setItems] = useState<ExamListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Read local catalog first
      const listings = await examApi.getExams(courseId, kind);
      if (listings && listings.length > 0) {
        const sorted = [...listings].sort(
          (a, b) => Number(b.university.id === home) - Number(a.university.id === home),
        );
        setItems(sorted);
        setLoading(false);
      }

      // 2. Revalidate in background if online
      if (isOnline()) {
        try {
          const fresh = await realExamApi.getExams(courseId, kind);
          if (Array.isArray(fresh) && fresh.length > 0) {
            const sortedFresh = [...fresh].sort(
              (a, b) => Number(b.university.id === home) - Number(a.university.id === home),
            );
            setItems((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(sortedFresh)) {
                return sortedFresh;
              }
              return prev;
            });
          }
        } catch (fetchErr) {
          if (!listings || listings.length === 0) {
            throw fetchErr;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [courseId, kind, home]);

  useEffect(() => {
    let active = true;
    void loadData();
    return () => {
      active = false;
    };
  }, [loadData]);

  return { items, loading, error, reload: () => loadData() };
}
