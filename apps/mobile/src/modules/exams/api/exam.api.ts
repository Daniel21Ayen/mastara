// apps/mobile/src/modules/exams/api/exam.api.ts
import type { Exam, Question, University } from '@mastara/contracts';
import type { ExamKind } from '@mastara/domain';

import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
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
    return httpClient.get<ExamListing[]>(`/assessment/exams/courses/${encodeURIComponent(courseId)}?kind=${kind}`);
  },
  async getSession(examId: string): Promise<ExamSessionData | null> {
    try {
      return await httpClient.get<ExamSessionData>(`/assessment/exams/${encodeURIComponent(examId)}/session`);
    } catch {
      return null;
    }
  },
};

/** The real remote server API. Used to download an exam. */
export const examRemote: ExamApi = realExamApi;

import { getLocalCatalogExams, parseCatalogMeta } from '@/core/sync/catalogSync';

/** Online first with local catalog SQLite. An exam session opens offline when downloaded. */
export const examApi = gatewayReads('exam', examRemote, {
  details: ['getSession'],
  lists: {
    getExams: async (courseId: string, kind: ExamKind) => {
      const [localRows, saved] = await Promise.all([
        getLocalCatalogExams(courseId),
        downloadStore.listByKind<ExamListing>('EXAM', courseId).catch(() => []),
      ]);

      const savedMap = new Map((saved ?? []).map((s) => [s.meta.exam.id, s.meta]));

      if (localRows.length > 0) {
        return localRows
          .map((r) => {
            const savedItem = savedMap.get(r.id);
            if (savedItem) return savedItem;
            let title = { en: r.title, am: r.title };
            if (r.title && r.title.startsWith('{')) {
              try {
                const parsed = JSON.parse(r.title);
                title = { en: parsed.en || r.title, am: parsed.am || parsed.en || r.title };
              } catch {}
            }
            const meta = parseCatalogMeta<{ kind?: string; durationMinutes?: number; passingScore?: number; university?: University; universityName?: string; universityCode?: string }>(r.meta);
            return {
              exam: {
                id: r.id,
                courseId: r.course_id,
                universityId: r.parent_id || '',
                kind: (meta?.kind || kind) as ExamKind,
                year: r.position,
                title,
                durationMinutes: meta?.durationMinutes ?? 120,
                passingScore: meta?.passingScore ?? 50,
                isFree: Boolean(r.is_free),
              },
              university: meta?.university ?? {
                id: r.parent_id || 'default',
                name: meta?.universityName ?? 'University',
                code: meta?.universityCode ?? '',
              },
            };
          })
          .filter((listing) => listing.exam.kind === kind);
      }

      return (saved ?? []).map((item) => item.meta).filter((listing) => listing.exam.kind === kind);
    },
  },
});

export const examKey = (examId: string): string => contentKey('exam', 'getSession', [examId]);
