// apps/admin-web/src/modules/tests/api/tests.api.ts
import {
  adminQuestionSchema,
  questionInputSchema,
  questionListResultSchema,
  quizSettingsSchema,
  quizSummarySchema,
  testsOverviewSchema,
} from '@mastara/contracts';
import type {
  AdminQuestion,
  QuestionInput,
  QuestionListQuery,
  QuestionListResult,
  QuizSettingsInput,
  QuizSummary,
  TestsOverview,
} from '@mastara/contracts';
import type { QuizNumber } from '@mastara/domain';
import { httpClient } from '@/core/network';

/**
 * Unpublishing a question or a quiz needs a reason, and a question can only be published when it is
 * finished. A quiz can only be published when it has a published question. Every write is audited.
 */
export interface TestsApi {
  getOverview(courseId: string): Promise<TestsOverview>;
  updateQuiz(courseId: string, quizNo: QuizNumber, input: QuizSettingsInput): Promise<QuizSummary>;
  listQuestions(query: QuestionListQuery): Promise<QuestionListResult>;
  getQuestion(id: string): Promise<AdminQuestion>;
  createQuestion(input: QuestionInput): Promise<AdminQuestion>;
  updateQuestion(id: string, input: QuestionInput): Promise<AdminQuestion>;
  deleteQuestion(id: string): Promise<{ success: boolean }>;
}

export const realTestsApi: TestsApi = {
  async getOverview(courseId: string): Promise<TestsOverview> {
    const raw = await httpClient.get<TestsOverview>(
      `/assessment/admin/courses/${courseId}/tests-overview`,
    );
    return testsOverviewSchema.parse(raw);
  },

  async updateQuiz(
    courseId: string,
    quizNo: QuizNumber,
    input: QuizSettingsInput,
  ): Promise<QuizSummary> {
    const payload = quizSettingsSchema.parse(input);
    const raw = await httpClient.put<QuizSummary>(
      `/assessment/admin/courses/${courseId}/quizzes/${quizNo}`,
      payload,
    );
    return quizSummarySchema.parse(raw);
  },

  async listQuestions(query: QuestionListQuery): Promise<QuestionListResult> {
    const params = new URLSearchParams();
    if (query.quizNo) params.set('quizNo', String(query.quizNo));
    if (query.courseId) params.set('courseId', query.courseId);
    if (query.form) params.set('form', query.form);
    if (query.status) params.set('status', query.status);
    if (query.q && query.q.trim()) params.set('q', query.q.trim());
    if (query.page) params.set('page', String(query.page));

    const qs = params.toString();
    const url = qs ? `/assessment/admin/questions?${qs}` : '/assessment/admin/questions';
    const raw = await httpClient.get<QuestionListResult>(url);
    return questionListResultSchema.parse(raw);
  },

  async getQuestion(id: string): Promise<AdminQuestion> {
    const raw = await httpClient.get<AdminQuestion>(`/assessment/admin/questions/${id}`);
    return adminQuestionSchema.parse(raw);
  },

  async createQuestion(input: QuestionInput): Promise<AdminQuestion> {
    const payload = questionInputSchema.parse(input);
    const raw = await httpClient.post<AdminQuestion>('/assessment/admin/questions', payload);
    return adminQuestionSchema.parse(raw);
  },

  async updateQuestion(id: string, input: QuestionInput): Promise<AdminQuestion> {
    const payload = questionInputSchema.parse(input);
    const raw = await httpClient.put<AdminQuestion>(`/assessment/admin/questions/${id}`, payload);
    return adminQuestionSchema.parse(raw);
  },

  async deleteQuestion(id: string): Promise<{ success: boolean }> {
    return httpClient.delete<{ success: boolean }>(`/assessment/admin/questions/${id}`);
  },
};

export const testsApi: TestsApi = realTestsApi;
