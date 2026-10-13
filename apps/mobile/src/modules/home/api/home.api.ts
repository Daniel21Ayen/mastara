// apps/mobile/src/modules/home/api/home.api.ts
import type { HomeSummary, StudentProfile } from '@mastara/contracts';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface HomeApi {
  getSummary(userId: string, profile: StudentProfile): Promise<HomeSummary>;
}

const realHomeApi: HomeApi = {
  async getSummary(_userId, _profile) {
    return httpClient.get<HomeSummary>('/learning/home-summary');
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const homeApi = cacheReads('home', realHomeApi, ['getSummary']);
