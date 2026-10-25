// apps/mobile/src/modules/quizzes/api/quiz.api.ts
import type { Question, QuizChapter } from '@mastara/contracts';
import type { QuizNumber } from '@mastara/domain';

import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
import { httpClient } from '@/core/network';

export interface QuizApi {
  getChapters(courseId: string, quizNo: QuizNumber): Promise<QuizChapter[]>;
  getChapter(chapterId: string): Promise<QuizChapter | null>;
  getQuestions(chapterId: string): Promise<Question[]>;
}

export const realQuizApi: QuizApi = {
  async getChapters(courseId: string, quizNo: QuizNumber): Promise<QuizChapter[]> {
    return httpClient.get<QuizChapter[]>(
      `/assessment/quizzes/courses/${encodeURIComponent(courseId)}/chapters?quizNo=${quizNo}`,
    );
  },
  async getChapter(chapterId: string): Promise<QuizChapter | null> {
    try {
      return await httpClient.get<QuizChapter>(`/assessment/quizzes/chapters/${encodeURIComponent(chapterId)}`);
    } catch {
      return null;
    }
  },
  async getQuestions(chapterId: string): Promise<Question[]> {
    return httpClient.get<Question[]>(`/assessment/quizzes/chapters/${encodeURIComponent(chapterId)}/questions`);
  },
};

/** The real remote server API. Used to download a quiz chapter. */
export const quizRemote: QuizApi = realQuizApi;

import { getLocalCatalogQuizChapters, parseCatalogMeta } from '@/core/sync';

/** Online first with local catalog SQLite. A chapter body opens offline when downloaded. */
export const quizApi = gatewayReads('quiz', quizRemote, {
  details: ['getChapter', 'getQuestions'],
  lists: {
    getChapters: async (courseId: string, quizNo: QuizNumber) => {
      const [localRows, saved] = await Promise.all([
        getLocalCatalogQuizChapters(courseId),
        downloadStore.listByKind<QuizChapter>('QUIZ_CHAPTER', courseId).catch(() => []),
      ]);

      const savedMap = new Map((saved ?? []).map((s) => [s.meta.id, s.meta]));

      if (localRows.length > 0) {
        return localRows
          .map((r) => {
            const savedItem = savedMap.get(r.id);
            if (savedItem) return savedItem;
            let title = { en: r.title, am: r.title };
            if (r.title && r.title.startsWith('{')) {
              try {
                const parsed = JSON.parse(r.title);
                title = { en: parsed.en || r.title, am: parsed.am || parsed.en || r.title };
              } catch {}
            }
            const meta = parseCatalogMeta<{ quizNo?: number; chapterNumber?: number; questionCount?: number; durationMinutes?: number }>(r.meta);
            return {
              id: r.id,
              courseId: r.course_id,
              quizNo: (meta?.quizNo ?? quizNo) as QuizNumber,
              chapterNumber: meta?.chapterNumber ?? r.position,
              title,
              questionCount: meta?.questionCount ?? 10,
              durationMinutes: meta?.durationMinutes ?? 15,
              isFree: Boolean(r.is_free),
            };
          })
          .filter((ch) => ch.quizNo === quizNo)
          .sort((a, b) => a.chapterNumber - b.chapterNumber);
      }

      return (saved ?? [])
        .map((item) => item.meta)
        .filter((chapter) => chapter.quizNo === quizNo)
        .sort((a, b) => a.chapterNumber - b.chapterNumber);
    },
  },
});

export const chapterKey = (chapterId: string): string => contentKey('quiz', 'getChapter', [chapterId]);
export const questionsKey = (chapterId: string): string => contentKey('quiz', 'getQuestions', [chapterId]);
export const chapterKeys = (chapterId: string) => ({
  chapter: chapterKey(chapterId),
  questions: questionsKey(chapterId),
});
