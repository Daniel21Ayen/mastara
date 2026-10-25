// apps/mobile/src/modules/profile/api/profile.api.ts
import type { StudentProfile } from '@mastara/contracts';

import { httpClient } from '@/core/network';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import type { PendingStudentSync } from '@/modules/auth/api/auth.api';

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

export const realProfileApi: ProfileApi = {
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

export const profileApi: ProfileApi = {
  getProfile: async (userId) => {
    // 1. Check local pending registration / offline profile
    const pendingSync = await secureStorage.getJson<PendingStudentSync>(STORAGE_KEYS.pendingRemoteSync);
    if (pendingSync && (pendingSync.userId === userId || !pendingSync.purchased)) {
      if (pendingSync.profile) {
        return pendingSync.profile;
      }
    }

    // 2. Check local session
    const session = await secureStorage.getJson<{ user: { id: string }; profile: StudentProfile | null }>(
      STORAGE_KEYS.session,
    );
    if (session?.user?.id === userId && session.profile) {
      return session.profile;
    }

    try {
      return await realProfileApi.getProfile(userId);
    } catch {
      return session?.profile ?? null;
    }
  },
  saveProfile: async (userId, profile) => {
    // If student is unpurchased (LOCAL_ONLY), save locally only. Do not insert/save to DB until purchase
    const pendingSync = await secureStorage.getJson<PendingStudentSync>(STORAGE_KEYS.pendingRemoteSync);
    if (pendingSync && !pendingSync.purchased) {
      pendingSync.profile = profile;
      await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, pendingSync);
      return profile;
    }

    return realProfileApi.saveProfile(userId, profile);
  },
};
