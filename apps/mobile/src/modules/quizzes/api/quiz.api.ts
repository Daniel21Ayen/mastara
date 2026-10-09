// apps/mobile/src/modules/quizzes/api/quiz.api.ts
import type { Question, QuizChapter } from '@mastara/contracts';
import type { QuizNumber } from '@mastara/domain';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import { buildChapters, buildQuestions, courses, findChapter } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface QuizApi {
  getChapters(courseId: string, quizNo: QuizNumber): Promise<QuizChapter[]>;
  getChapter(chapterId: string): Promise<QuizChapter | null>;
  getQuestions(chapterId: string): Promise<Question[]>;
}

const mockQuizApi: QuizApi = {
  async getChapters(courseId, quizNo) {
    await simulateLatency(150);
    const course = courses.find((item) => item.id === courseId);
    return course ? buildChapters(course).filter((chapter) => chapter.quizNo === quizNo) : [];
  },
  async getChapter(chapterId) {
    await simulateLatency(100);
    return findChapter(chapterId);
  },
  async getQuestions(chapterId) {
    await simulateLatency(150);
    const chapter = findChapter(chapterId);
    return chapter ? buildQuestions(chapter) : [];
  },
};

function createQuizApi(): QuizApi {
  if (env.useMocks) return mockQuizApi;
  throw new Error('The real quiz API is added in the backend integration phase.');
}

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const quizApi = cacheReads('quiz', createQuizApi(), ['getChapters', 'getChapter', 'getQuestions']);
