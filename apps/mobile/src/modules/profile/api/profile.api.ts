// apps/mobile/src/modules/profile/api/profile.api.ts
import type { StudentProfile } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { getMockProfile, saveMockProfile } from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';

export interface ProfileApi {
  getProfile(userId: string): Promise<StudentProfile | null>;
  saveProfile(userId: string, profile: StudentProfile): Promise<StudentProfile>;
}

const mockProfileApi: ProfileApi = {
  async getProfile(userId) {
    await simulateLatency();
    return getMockProfile(userId);
  },
  async saveProfile(userId, profile) {
    await simulateLatency();
    saveMockProfile(userId, profile);
    return profile;
  },
};

function createProfileApi(): ProfileApi {
  if (env.useMocks) return mockProfileApi;
  throw new Error('The real profile API is added in the backend integration phase.');
}

export const profileApi = createProfileApi();
