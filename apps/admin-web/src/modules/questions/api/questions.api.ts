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

function createQuestionsApi(): QuestionsApi {
  if (env.useMocks) return mockQuestionsApi;
  throw new Error('The real questions API is added in the backend integration phase.');
}

export const questionsApi = createQuestionsApi();
