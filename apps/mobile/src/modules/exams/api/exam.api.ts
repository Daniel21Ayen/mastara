// apps/mobile/src/modules/exams/api/exam.api.ts
import type { Exam, Question, University } from '@mastara/contracts';
import type { ExamKind } from '@mastara/domain';

import { cacheReads } from '@/core/db';
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

const realExamApi: ExamApi = {
  async getExams(courseId, kind) {
    return httpClient.get<ExamListing[]>(`/assessment/exams/courses/${courseId}?kind=${kind}`);
  },
  async getSession(examId) {
    return httpClient.get<ExamSessionData>(`/assessment/exams/${examId}/session`);
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const examApi = cacheReads('exam', realExamApi, ['getExams', 'getSession']);
