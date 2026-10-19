// apps/mobile/src/modules/quizzes/api/quiz.api.ts
import type { Question, QuizChapter } from '@mastara/contracts';
import type { QuizNumber } from '@mastara/domain';

import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
import { buildChapters, buildQuestions, courses, findChapter } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient } from '@/core/network';

export interface QuizApi {
  getChapters(courseId: string, quizNo: QuizNumber): Promise<QuizChapter[]>;
  getChapter(chapterId: string): Promise<QuizChapter | null>;
  getQuestions(chapterId: string): Promise<Question[]>;
}

export const realQuizApi: QuizApi = {
  async getChapters(courseId: string, quizNo: QuizNumber): Promise<QuizChapter[]> {
    return httpClient.get<QuizChapter[]>(
      `/assessment/quizzes/courses/${courseId}/chapters?quizNo=${quizNo}`,
    );
  },
  async getChapter(chapterId: string): Promise<QuizChapter | null> {
    try {
      return await httpClient.get<QuizChapter>(`/assessment/quizzes/chapters/${chapterId}`);
    } catch {
      return null;
    }
  },
  async getQuestions(chapterId: string): Promise<Question[]> {
    return httpClient.get<Question[]>(`/assessment/quizzes/chapters/${chapterId}/questions`);
  },
};

/** The server, with no download rules. Used to download a quiz chapter. */
export const quizRemote = realQuizApi;

/** Online first. A chapter opens offline only if the student downloaded it. */
export const quizApi = gatewayReads('quiz', quizRemote, {
  details: ['getChapter', 'getQuestions'],
  lists: {
    getChapters: async (courseId: string, quizNo: QuizNumber) => {
      const saved = await downloadStore.listByKind<QuizChapter>('QUIZ_CHAPTER', courseId);
      return saved.map((item) => item.meta).filter((chapter) => chapter.quizNo === quizNo).sort((a, b) => a.chapterNumber - b.chapterNumber);
    },
  },
});

export const chapterKeys = (chapterId: string) => ({
  chapter: contentKey('quiz', 'getChapter', [chapterId]),
  questions: contentKey('quiz', 'getQuestions', [chapterId]),
});
