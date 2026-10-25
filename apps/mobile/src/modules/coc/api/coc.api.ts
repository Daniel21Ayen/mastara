// apps/mobile/src/modules/coc/api/coc.api.ts
import type { CocSet, Question } from '@mastara/contracts';

import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
import { httpClient } from '@/core/network';

export interface CocSession {
  set: CocSet;
  questions: Question[];
  /** courseId -> title, for the per-course result breakdown. */
  courseTitles: Record<string, string>;
}

export interface CocApi {
  /** COC sets built from the student's courses. */
  getSets(courseIds: readonly string[]): Promise<CocSet[]>;
  getSession(setId: string, courseIds: readonly string[]): Promise<CocSession | null>;
}

export const realCocApi: CocApi = {
  async getSets(_courseIds) {
    return httpClient.get<CocSet[]>('/assessment/coc/sets');
  },
  async getSession(setId, _courseIds) {
    try {
      return await httpClient.get<CocSession>(`/assessment/coc/sets/${encodeURIComponent(setId)}/session`);
    } catch {
      return null;
    }
  },
};

/** The real remote server API. Used to download a COC set. */
export const cocRemote: CocApi = realCocApi;

import { getLocalCatalogCocSets, parseCatalogMeta } from '@/core/sync/catalogSync';

/**
 * Online first with local catalog SQLite. A COC set session opens offline when downloaded.
 */
export const cocApi = gatewayReads('coc', cocRemote, {
  details: ['getSession'],
  lists: {
    getSets: async () => {
      const [localRows, saved] = await Promise.all([
        getLocalCatalogCocSets(),
        downloadStore.listByKind<CocSet>('COC_SET').catch(() => []),
      ]);

      const savedMap = new Map((saved ?? []).map((s) => [s.meta.id, s.meta]));

      if (localRows.length > 0) {
        return localRows.map((r) => {
          const savedItem = savedMap.get(r.id);
          if (savedItem) return savedItem;
          let title = { en: r.title, am: r.title };
          if (r.title && r.title.startsWith('{')) {
            try {
              const parsed = JSON.parse(r.title);
              title = { en: parsed.en || r.title, am: parsed.am || parsed.en || r.title };
            } catch {}
          }
          const meta = parseCatalogMeta<{ durationMinutes?: number; isTimed?: boolean; sampleQuestionCount?: number }>(r.meta);
          return {
            id: r.id,
            year: r.position,
            title,
            durationMinutes: meta?.durationMinutes ?? 180,
            isTimed: meta?.isTimed ?? true,
            sampleQuestionCount: meta?.sampleQuestionCount ?? 20,
            isFree: Boolean(r.is_free),
          };
        });
      }

      return (saved ?? []).map((item) => item.meta);
    },
  },
  keyArgs: { getSession: (args) => [args[0]] },
});

export const cocKey = (setId: string): string => contentKey('coc', 'getSession', [setId]);
