// apps/mobile/src/core/mock/data/profiles.ts
import type { StudentProfile } from '@mastara/contracts';

/** In-memory "server" copy of each student's profile. Written when the phone's queued change is uploaded. */
const profiles = new Map<string, StudentProfile>();

export const getMockProfile = (userId: string): StudentProfile | null => profiles.get(userId) ?? null;
export const saveMockProfile = (userId: string, profile: StudentProfile): void => {
  profiles.set(userId, profile);
};
