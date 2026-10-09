// apps/mobile/src/modules/exams/api/exam.api.ts
import type { Exam, Question, University } from '@mastara/contracts';
import type { ExamKind } from '@mastara/domain';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import { buildExamQuestions, buildExams, courses, findExam, universities } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface ExamListing {
  exam: Exam;
  university: University;
}

export interface ExamSessionData {
  exam: Exam;
  university: University;
  questions: Question[];
}

export interface ExamApi {
  /** Exams of one kind for a course. */
  getExams(courseId: string, kind: ExamKind): Promise<ExamListing[]>;
  getSession(examId: string): Promise<ExamSessionData | null>;
}

function universityOf(id: string): University | undefined {
  return universities.find((item) => item.id === id);
}

const mockExamApi: ExamApi = {
  async getExams(courseId, kind) {
    await simulateLatency(150);
    const course = courses.find((item) => item.id === courseId);
    if (!course) return [];

    return buildExams(course)
      .filter((exam) => exam.kind === kind)
      .flatMap((exam) => {
        const university = universityOf(exam.universityId);
        return university ? [{ exam, university }] : [];
      });
  },
  async getSession(examId) {
    await simulateLatency(150);
    const exam = findExam(examId);
    const university = exam ? universityOf(exam.universityId) : undefined;
    return exam && university ? { exam, university, questions: buildExamQuestions(exam) } : null;
  },
};

function createExamApi(): ExamApi {
  if (env.useMocks) return mockExamApi;
  throw new Error('The real exam API is added in the backend integration phase.');
}

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const examApi = cacheReads('exam', createExamApi(), ['getExams', 'getSession']);
