// apps/mobile/src/modules/profile/api/profile.api.ts
import type { StudentProfile } from '@mastara/contracts';

import { httpClient } from '@/core/network';

export interface ProfileApi {
  getProfile(userId: string): Promise<StudentProfile | null>;
  saveProfile(userId: string, profile: StudentProfile): Promise<StudentProfile>;
}

export const profileApi: ProfileApi = {
  async getProfile() {
    const res = await httpClient.get<any>('/profile/me');
    if (!res || !res.academic) return null;
    return {
      universityId: res.academic.universityId,
      programId: res.academic.programId,
      semesterId: res.academic.semesterId,
      stream: res.academic.stream,
      courseIds: res.courseIds ?? [],
    };
  },
  async saveProfile(_userId, profile) {
    if (profile.universityId && profile.programId && profile.semesterId && profile.stream) {
      await httpClient.put('/profile/academic', {
        universityId: profile.universityId,
        programId: profile.programId,
        semesterId: profile.semesterId,
        stream: profile.stream,
      });
    }
    if (profile.courseIds) {
      await httpClient.put('/profile/courses', {
        courseIds: profile.courseIds,
      });
    }
    return profile;
  },
};
