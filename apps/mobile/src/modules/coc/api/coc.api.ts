// apps/mobile/src/modules/coc/api/coc.api.ts
import type { CocSet, Question } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { contentKey, downloadStore, gatewayReads } from '@/core/downloads';
import { buildCocQuestions, buildCocSets, courseTitles } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

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

const mockCocApi: CocApi = {
  async getSets(courseIds) {
    await simulateLatency(150);
    return buildCocSets(courseIds);
  },
  async getSession(setId, courseIds) {
    await simulateLatency(150);
    const set = buildCocSets(courseIds).find((item) => item.id === setId);
    if (!set) return null;
    return { set, questions: buildCocQuestions(setId, courseIds), courseTitles: courseTitles(courseIds) };
  },
};

function createCocApi(): CocApi {
  if (env.useMocks) return mockCocApi;
  throw new Error('The real COC API is added in the backend integration phase.');
}

/** The server, with no download rules. Used to download a COC set. */
export const cocRemote = createCocApi();

/**
 * Online first. A COC set opens offline only if the student downloaded it. A downloaded set is a fixed snapshot,
 * so its key does not depend on which courses the student has right now.
 */
export const cocApi = gatewayReads('coc', cocRemote, {
  details: ['getSession'],
  lists: {
    getSets: async () => (await downloadStore.listByKind<CocSet>('COC_SET')).map((item) => item.meta),
  },
  keyArgs: { getSession: (args) => [args[0]] },
});

export const cocKey = (setId: string): string => contentKey('coc', 'getSession', [setId]);
