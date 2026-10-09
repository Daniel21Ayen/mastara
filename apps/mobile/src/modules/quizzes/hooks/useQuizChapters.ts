// apps/mobile/src/modules/quizzes/hooks/useQuizChapters.ts
import type { QuizChapter } from '@mastara/contracts';
import type { QuizNumber } from '@mastara/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useAsync } from '@/shared/hooks';

import { quizApi } from '../api/quiz.api';
import { attemptRepository } from '../repo/attempt.repository';

export interface ChapterWithBest {
  chapter: QuizChapter;
  /** Best score as { correct, total }, or null if never practised. */
  best: { correct: number; total: number } | null;
}

/** Chapters of one quiz with the student's best score. Reloads when the screen regains focus. */
export function useQuizChapters(courseId: string, quizNo: QuizNumber) {
  const state = useAsync(async (): Promise<ChapterWithBest[]> => {
    const chapters = await quizApi.getChapters(courseId, quizNo);
    return Promise.all(
      chapters.map(async (chapter) => {
        const best = await attemptRepository.getBest(chapter.id);
        return { chapter, best: best ? { correct: best.correct, total: best.total } : null };
      }),
    );
  }, [courseId, quizNo]);

  const { reload } = state;
  useFocusEffect(useCallback(() => reload(), [reload]));

  return { items: state.data ?? [], loading: state.loading, error: state.error, reload };
}
