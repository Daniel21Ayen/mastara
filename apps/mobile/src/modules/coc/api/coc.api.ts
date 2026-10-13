// apps/mobile/src/modules/coc/api/coc.api.ts
import type { CocSet, Question } from '@mastara/contracts';

import { cacheReads } from '@/core/db';
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

const realCocApi: CocApi = {
  async getSets(_courseIds) {
    return httpClient.get<CocSet[]>('/assessment/coc/sets');
  },
  async getSession(setId, _courseIds) {
    return httpClient.get<CocSession>(`/assessment/coc/sets/${setId}/session`);
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const cocApi = cacheReads('coc', realCocApi, ['getSets', 'getSession']);
