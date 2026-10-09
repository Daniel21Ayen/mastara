// apps/mobile/src/modules/coc/api/coc.api.ts
import type { CocSet, Question } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
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

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const cocApi = cacheReads('coc', createCocApi(), ['getSets', 'getSession']);
