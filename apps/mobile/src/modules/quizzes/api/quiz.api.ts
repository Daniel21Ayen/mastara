// apps/mobile/src/modules/quizzes/api/quiz.api.ts
import type { Question, QuizChapter } from '@mastara/contracts';
import type { QuizNumber } from '@mastara/domain';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface QuizApi {
  getChapters(courseId: string, quizNo: QuizNumber): Promise<QuizChapter[]>;
  getChapter(chapterId: string): Promise<QuizChapter | null>;
  getQuestions(chapterId: string): Promise<Question[]>;
}

const realQuizApi: QuizApi = {
  async getChapters(courseId, quizNo) {
    return httpClient.get<QuizChapter[]>(
      `/assessment/quizzes/courses/${courseId}/chapters?quizNo=${quizNo}`,
    );
  },
  async getChapter(chapterId) {
    return httpClient.get<QuizChapter>(`/assessment/quizzes/chapters/${chapterId}`);
  },
  async getQuestions(chapterId) {
    return httpClient.get<Question[]>(`/assessment/quizzes/chapters/${chapterId}/questions`);
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const quizApi = cacheReads('quiz', realQuizApi, ['getChapters', 'getChapter', 'getQuestions']);
