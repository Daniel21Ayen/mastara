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
import { statusChange } from '@mastara/domain';
import type { AuditAction, CatalogStatus, QuizNumber } from '@mastara/domain';

import { env } from '@/core/config/env';
import { httpClient } from '@/core/network';
import {
  courseById,
  createQuestion,
  getQuestion,
  listQuestions,
  recordAudit,
  testsOverview,
  updateQuestion,
  updateQuiz,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

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
}

const courseCode = (courseId: string): string => courseById(courseId)?.code ?? courseId;

function editAction(
  before: CatalogStatus,
  after: CatalogStatus,
  names: { published: AuditAction; unpublished: AuditAction; updated: AuditAction },
): AuditAction {
  const change = statusChange(before, after);
  if (change === 'PUBLISH') return names.published;
  if (change === 'UNPUBLISH') return names.unpublished;
  return names.updated;
}

const mockTestsApi: TestsApi = {
  async getOverview(courseId) {
    await simulateLatency();
    return testsOverviewSchema.parse(testsOverview(courseId));
  },

  async updateQuiz(courseId, quizNo, input) {
    await simulateLatency();
    const parsed = quizSettingsSchema.parse(input);
    const { quiz, before } = updateQuiz(courseId, quizNo, parsed);
    recordAudit({
      actor: 'ADMIN',
      action: editAction(before, quiz.status, {
        published: 'QUIZ_PUBLISHED',
        unpublished: 'QUIZ_UNPUBLISHED',
        updated: 'QUIZ_UPDATED',
      }),
      target: `Quiz ${quizNo} · ${courseCode(courseId)}`,
      reason: parsed.reason,
    });
    return quizSummarySchema.parse(quiz);
  },

  async listQuestions(query) {
    await simulateLatency();
    return questionListResultSchema.parse(listQuestions(query));
  },

  async getQuestion(id) {
    await simulateLatency();
    return adminQuestionSchema.parse(getQuestion(id));
  },

  async createQuestion(input) {
    await simulateLatency();
    const question = createQuestion(questionInputSchema.parse(input));
    recordAudit({
      actor: 'ADMIN',
      action: question.status === 'PUBLISHED' ? 'QUESTION_PUBLISHED' : 'QUESTION_CREATED',
      target: `Question ${question.id} · Quiz ${question.quizNo} · ${question.courseCode}`,
    });
    return adminQuestionSchema.parse(question);
  },

  async updateQuestion(id, input) {
    await simulateLatency();
    const parsed = questionInputSchema.parse(input);
    const { question, before } = updateQuestion(id, parsed);
    recordAudit({
      actor: 'ADMIN',
      action: editAction(before, question.status, {
        published: 'QUESTION_PUBLISHED',
        unpublished: 'QUESTION_UNPUBLISHED',
        updated: 'QUESTION_UPDATED',
      }),
      target: `Question ${question.id} · Quiz ${question.quizNo} · ${question.courseCode}`,
      reason: parsed.reason,
    });
    return adminQuestionSchema.parse(question);
  },
};

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
};

function createTestsApi(): TestsApi {
  if (env.useMocks) return mockTestsApi;
  return realTestsApi;
}

export const testsApi = createTestsApi();

