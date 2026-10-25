// apps/mobile/src/modules/quizzes/hooks/useQuizChapters.ts
import type { QuizChapter } from '@mastara/contracts';
import type { QuizNumber } from '@mastara/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { isOnline } from '@/core/network';

import { quizApi, realQuizApi } from '../api/quiz.api';
import { attemptRepository } from '../repo/attempt.repository';

export interface ChapterWithBest {
  chapter: QuizChapter;
  /** Best score as { correct, total }, or null if never practised. */
  best: { correct: number; total: number } | null;
}

/**
 * Chapters of one quiz with the student's best score.
 * Reads from SQLite catalog first and renders immediately (no spinner when local rows exist).
 * Refreshes in background if online (stale-while-revalidate).
 */
export function useQuizChapters(courseId: string, quizNo: QuizNumber) {
  const [items, setItems] = useState<ChapterWithBest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Read local catalog + local attempts immediately
      const chapters = await quizApi.getChapters(courseId, quizNo);
      if (chapters && chapters.length > 0) {
        const mapped = await Promise.all(
          chapters.map(async (chapter) => {
            const best = await attemptRepository.getBest(chapter.id);
            return { chapter, best: best ? { correct: best.correct, total: best.total } : null };
          }),
        );
        setItems(mapped);
        setLoading(false);
      }

      // 2. Revalidate in background if online
      if (isOnline()) {
        try {
          const freshChapters = await realQuizApi.getChapters(courseId, quizNo);
          if (Array.isArray(freshChapters) && freshChapters.length > 0) {
            const freshMapped = await Promise.all(
              freshChapters.map(async (chapter) => {
                const best = await attemptRepository.getBest(chapter.id);
                return { chapter, best: best ? { correct: best.correct, total: best.total } : null };
              }),
            );
            setItems((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(freshMapped)) {
                return freshMapped;
              }
              return prev;
            });
          }
        } catch (fetchErr) {
          if (!chapters || chapters.length === 0) {
            throw fetchErr;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [courseId, quizNo]);

  useEffect(() => {
    let active = true;
    void loadData();
    return () => {
      active = false;
    };
  }, [loadData]);

  useFocusEffect(useCallback(() => {
    void loadData();
  }, [loadData]));

  return { items, loading, error, reload: () => loadData() };
}
