import {
  bulkQuestionImportInputSchema,
  bulkQuestionImportResultSchema,
  examSetInputSchema,
  examSetListResultSchema,
  examSetSchema,
} from '@mastara/contracts';
import type {
  BulkQuestionImportInput,
  BulkQuestionImportResult,
  ExamSet,
  ExamSetInput,
  ExamSetListQuery,
  ExamSetListResult,
} from '@mastara/contracts';
import {
  exportExamSetToCsv,
  exportExamSetToPrintableHtml,
  parseBulkQuestions,
  statusChange,
} from '@mastara/domain';
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

export interface ExportSetOptions {
  includeAnswers?: boolean;
  autoprint?: boolean;
}

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
  bulkImport(input: BulkQuestionImportInput | FormData): Promise<BulkQuestionImportResult>;
  exportSet(
    id: string,
    format: 'csv' | 'pdf' | 'html',
    options?: ExportSetOptions,
  ): Promise<{ content: string; filename: string; contentType: string }>;
  downloadSet(
    id: string,
    format: 'csv' | 'pdf' | 'html',
    options?: ExportSetOptions,
  ): Promise<void>;
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

  async bulkImport(input) {
    await simulateLatency();
    let content = '';
    let dryRun = true;
    let targetExamSetId: string | undefined;

    if (typeof FormData !== 'undefined' && input instanceof FormData) {
      dryRun = input.get('dryRun') === 'true';
      targetExamSetId = (input.get('targetExamSetId') as string) || undefined;
      const file = input.get('file');
      if (file && typeof (file as any).text === 'function') {
        content = await (file as any).text();
      } else {
        content = (input.get('content') as string) || '';
      }
    } else {
      const parsed = bulkQuestionImportInputSchema.parse(input);
      content = parsed.content;
      dryRun = parsed.dryRun;
      targetExamSetId = parsed.targetExamSetId;
    }

    const parseRes = parseBulkQuestions(content);
    return bulkQuestionImportResultSchema.parse({
      totalRows: parseRes.totalRows,
      validRows: parseRes.validRows,
      errorRows: parseRes.errorRows,
      errors: parseRes.errors,
      preview: parseRes.questions,
      appliedCount: dryRun ? 0 : parseRes.questions.length,
      targetExamSetId,
    });
  },

  async exportSet(id, format = 'csv', options = {}) {
    await simulateLatency();
    const set = getExamSet(id);
    if (!set) throw new Error(`Exam set ${id} not found`);

    if (format === 'csv') {
      return {
        content: exportExamSetToCsv(set),
        filename: `${set.id}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }

    return {
      content: exportExamSetToPrintableHtml(set, options),
      filename: `${set.id}-exam-sheet.html`,
      contentType: 'text/html; charset=utf-8',
    };
  },

  async downloadSet(id, format = 'csv', options = {}) {
    const res = await this.exportSet(id, format, options);
    if (typeof window === 'undefined') return;

    if (format === 'csv') {
      const blob = new Blob([res.content], { type: res.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(res.content);
        win.document.close();
      }
    }
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

  async bulkImport(input: BulkQuestionImportInput | FormData): Promise<BulkQuestionImportResult> {
    let raw: unknown;
    if (typeof FormData !== 'undefined' && input instanceof FormData) {
      raw = await httpClient.post<BulkQuestionImportResult>(
        '/assessment/admin/questions/bulk-import',
        input,
      );
    } else {
      const payload = bulkQuestionImportInputSchema.parse(input);
      raw = await httpClient.post<BulkQuestionImportResult>(
        '/assessment/admin/questions/bulk-import',
        payload,
      );
    }
    return bulkQuestionImportResultSchema.parse(raw);
  },

  async exportSet(id: string, format = 'csv', options = {}) {
    const params = new URLSearchParams();
    params.set('format', format);
    if (options.includeAnswers !== undefined) {
      params.set('includeAnswers', String(options.includeAnswers));
    }
    if (options.autoprint !== undefined) {
      params.set('autoprint', String(options.autoprint));
    }

    const qs = params.toString();
    const res = await httpClient.get<string>(
      `/assessment/admin/exam-sets/${encodeURIComponent(id)}/export?${qs}`,
    );
    const isCsv = format === 'csv';
    return {
      content: typeof res === 'string' ? res : JSON.stringify(res),
      filename: isCsv ? `${id}.csv` : `${id}-exam-sheet.html`,
      contentType: isCsv ? 'text/csv; charset=utf-8' : 'text/html; charset=utf-8',
    };
  },

  async downloadSet(id: string, format = 'csv', options = {}) {
    if (typeof window === 'undefined') return;
    const token = await httpClient.getToken();
    const params = new URLSearchParams();
    params.set('format', format);
    if (options.includeAnswers !== undefined) {
      params.set('includeAnswers', String(options.includeAnswers));
    }
    if (options.autoprint !== undefined) {
      params.set('autoprint', String(options.autoprint));
    }

    const qs = params.toString();
    const url = `${env.apiUrl.replace(/\/$/, '')}/api/v1/assessment/admin/exam-sets/${encodeURIComponent(id)}/export?${qs}`;

    if (format === 'csv') {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${id}.csv`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } else {
      const win = window.open('', '_blank');
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const html = await res.text();
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    }
  },
};



function createQuestionsApi(): QuestionsApi {
  if (env.useMocks) return mockQuestionsApi;
  return realQuestionsApi;
}

export const questionsApi = createQuestionsApi();

