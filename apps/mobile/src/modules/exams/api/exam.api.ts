// apps/mobile/src/modules/exams/api/exam.api.ts
import type { Exam, Question, University } from '@mastara/contracts';
import type { ExamKind } from '@mastara/domain';

import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
import { buildExamQuestions, buildExams, courses, findExam, universityOf } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient } from '@/core/network';

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

export const realExamApi: ExamApi = {
  async getExams(courseId: string, kind: ExamKind): Promise<ExamListing[]> {
    return httpClient.get<ExamListing[]>(`/assessment/exams/courses/${courseId}?kind=${kind}`);
  },
  async getSession(examId: string): Promise<ExamSessionData | null> {
    try {
      return await httpClient.get<ExamSessionData>(`/assessment/exams/${examId}/session`);
    } catch {
      return null;
    }
  },
};

/** The server, with no download rules. Used to download an exam. */
export const examRemote = realExamApi;

/** Online first. An exam opens offline only if the student downloaded it. */
export const examApi = gatewayReads('exam', examRemote, {
  details: ['getSession'],
  lists: {
    getExams: async (courseId: string, kind: ExamKind) => {
      const saved = await downloadStore.listByKind<ExamListing>('EXAM', courseId);
      return saved.map((item) => item.meta).filter((listing) => listing.exam.kind === kind);
    },
  },
});

export const examKey = (examId: string): string => contentKey('exam', 'getSession', [examId]);
