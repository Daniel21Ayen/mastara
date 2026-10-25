// apps/admin-web/src/modules/questions/api/questions.api.ts
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
import { env } from '@/core/config/env';
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
    format?: 'csv' | 'pdf' | 'html',
    options?: ExportSetOptions,
  ): Promise<void>;
}

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

export const questionsApi: QuestionsApi = realQuestionsApi;
