// apps/admin-web/src/modules/questions/api/questions.api.ts
import {
  examSetInputSchema,
  examSetListResultSchema,
  examSetSchema,
} from '@mastara/contracts';
import type { ExamSet, ExamSetInput, ExamSetListQuery, ExamSetListResult } from '@mastara/contracts';
import { statusChange } from '@mastara/domain';
import type { AuditAction } from '@mastara/domain';

import { env } from '@/core/config/env';
import {
  findExamSet,
  findSetOfQuestion,
  getExamSet,
  listExamSets,
  recordAudit,
  saveExamSet,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient } from '@/core/network';

/**
 * An exam set is saved whole: its details and its questions. A new Exam Set ID creates the set.
 * Publishing needs finished questions, taking a published set back to draft needs a reason, and a
 * question ID can only be used once. Every save is audited.
 */
export interface QuestionsApi {
  listSets(query: ExamSetListQuery): Promise<ExamSetListResult>;
  getSet(id: string): Promise<ExamSet>;
  /** The set with this ID, or null when the ID is new. */
  findSet(id: string): Promise<ExamSet | null>;
  /** The ID of the set that already uses this question ID, or null. */
  questionOwner(questionId: string): Promise<string | null>;
  saveSet(input: ExamSetInput): Promise<ExamSet>;
}

function auditAction(created: boolean, change: ReturnType<typeof statusChange>): AuditAction {
  if (change === 'PUBLISH') return 'EXAM_SET_PUBLISHED';
  if (change === 'UNPUBLISH') return 'EXAM_SET_UNPUBLISHED';
  return created ? 'EXAM_SET_CREATED' : 'EXAM_SET_UPDATED';
}

const mockQuestionsApi: QuestionsApi = {
  async listSets(query) {
    await simulateLatency();
    return examSetListResultSchema.parse(listExamSets(query));
  },

  async getSet(id) {
    await simulateLatency();
    return examSetSchema.parse(getExamSet(id));
  },

  async findSet(id) {
    await simulateLatency(100);
    const set = findExamSet(id);
    return set ? examSetSchema.parse(set) : null;
  },

  async questionOwner(questionId) {
    await simulateLatency(100);
    return findSetOfQuestion(questionId);
  },

  async saveSet(input) {
    await simulateLatency();
    const parsed = examSetInputSchema.parse(input);
    const { set, created, before } = saveExamSet(parsed);
    const change = before === null ? (set.status === 'PUBLISHED' ? 'PUBLISH' : 'NONE') : statusChange(before, set.status);
    recordAudit({
      actor: 'ADMIN',
      action: auditAction(created, change),
      target: `Exam set ${set.id} · ${set.questions.length} questions`,
      reason: parsed.reason,
    });
    return examSetSchema.parse(set);
  },
};

export const realQuestionsApi: QuestionsApi = {
  async listSets(query: ExamSetListQuery): Promise<ExamSetListResult> {
    const params = new URLSearchParams();
    params.set('kind', query.kind);
    if (query.status) params.set('status', query.status);
    if (query.q && query.q.trim()) params.set('q', query.q.trim());
    if (query.page) params.set('page', String(query.page));

    const qs = params.toString();
    const raw = await httpClient.get<ExamSetListResult>(`/assessment/admin/exam-sets?${qs}`);
    return examSetListResultSchema.parse(raw);
  },

  async getSet(id: string): Promise<ExamSet> {
    const raw = await httpClient.get<ExamSet>(`/assessment/admin/exam-sets/${encodeURIComponent(id)}`);
    return examSetSchema.parse(raw);
  },

  async findSet(id: string): Promise<ExamSet | null> {
    try {
      const raw = await httpClient.get<ExamSet | null>(
        `/assessment/admin/exam-sets/lookup/${encodeURIComponent(id)}`,
      );
      return raw ? examSetSchema.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async questionOwner(questionId: string): Promise<string | null> {
    try {
      const raw = await httpClient.get<{ ownerSetId: string | null }>(
        `/assessment/admin/exam-sets/question-owner/${encodeURIComponent(questionId)}`,
      );
      return raw?.ownerSetId ?? null;
    } catch {
      return null;
    }
  },

  async saveSet(input: ExamSetInput): Promise<ExamSet> {
    const payload = examSetInputSchema.parse(input);
    const raw = await httpClient.post<ExamSet>('/assessment/admin/exam-sets', payload);
    return examSetSchema.parse(raw);
  },
};

function createQuestionsApi(): QuestionsApi {
  if (env.useMocks) return mockQuestionsApi;
  return realQuestionsApi;
}

export const questionsApi = createQuestionsApi();

