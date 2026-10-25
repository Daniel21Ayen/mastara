// apps/mobile/src/modules/home/api/home.api.ts
import type { HomeSummary, StudentProfile } from '@mastara/contracts';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface HomeApi {
  getSummary(userId: string, profile: StudentProfile): Promise<HomeSummary>;
}

export const realHomeApi: HomeApi = {
  async getSummary(_userId, _profile) {
    const summary = await httpClient.get<HomeSummary>('/learning/home-summary');
    return summary ?? {
      chaptersDone: 0,
      chaptersTotal: 0,
      activeProducts: 0,
      pendingProducts: 0,
      recent: [],
    };
  },
};

/** Reads are saved in SQLite cache and used when the phone is offline. */
export const homeApi = cacheReads('home', realHomeApi, ['getSummary']);
