// apps/mobile/src/modules/profile/api/profile.api.ts
import type { StudentProfile } from '@mastara/contracts';

import { httpClient } from '@/core/network';

export interface ProfileApi {
  getProfile(userId: string): Promise<StudentProfile | null>;
  saveProfile(userId: string, profile: StudentProfile): Promise<StudentProfile>;
}

interface BackendProfileResponse {
  id: string;
  name: string;
  identifier: string;
  academic: {
    universityId: string;
    programId: string;
    semesterId: string;
    stream: 'NATURAL' | 'SOCIAL' | null;
  } | null;
  courseIds: string[];
}

export const profileApi: ProfileApi = {
  async getProfile(_userId) {
    const res = await httpClient.get<BackendProfileResponse>('/profile/me');
    if (!res || !res.academic || !res.academic.universityId || !res.academic.programId || !res.academic.semesterId) {
      return null;
    }
    return {
      universityId: res.academic.universityId,
      programId: res.academic.programId,
      semesterId: res.academic.semesterId,
      stream: (res.academic.stream ?? 'NATURAL') as StudentProfile['stream'],
      courseIds: res.courseIds ?? [],
    };
  },
  async saveProfile(_userId, profile) {
    await httpClient.put('/profile/academic', {
      universityId: profile.universityId,
      programId: profile.programId,
      semesterId: profile.semesterId,
      stream: profile.stream,
    });
    await httpClient.put('/profile/courses', {
      courseIds: profile.courseIds,
    });
    return profile;
  },
};
