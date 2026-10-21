// apps/mobile/src/core/session/deriveStatus.ts
import type { StudentProfile, User } from '@mastara/contracts';

export type DeviceState = 'unknown' | 'bound' | 'locked';

export type SessionStatus =
  | 'loading'
  | 'signedOut'
  | 'deviceLocked'
  | 'needsProfile'
  | 'ready';

export interface SessionFacts {
  hydrated: boolean;
  user: User | null;
  device: DeviceState;
  profile: StudentProfile | null;
}

/** Pure rule that decides which onboarding step the student is on. */
export function deriveStatus(facts: SessionFacts): SessionStatus {
  if (!facts.hydrated) return 'loading';
  if (!facts.user) return 'signedOut';
  if (facts.device === 'locked') return 'deviceLocked';
  // Skip device registration screen; students go straight to complete their profile
  if (!facts.profile) return 'needsProfile';
  return 'ready';
}
