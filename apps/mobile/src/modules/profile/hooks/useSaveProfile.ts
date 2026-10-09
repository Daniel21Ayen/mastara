// apps/mobile/src/modules/profile/hooks/useSaveProfile.ts
import type { StudentProfile } from '@mastara/contracts';
import { useCallback } from 'react';

import { useSession } from '@/core/session';
import { outbox } from '@/core/sync';

/**
 * Saves the profile (including the course list) the offline-first way: the phone is updated at once and the
 * change is queued, then uploaded when the phone is online. It works without internet.
 */
export function useSaveProfile() {
  const { user, saveProfile } = useSession();

  return useCallback(
    async (profile: StudentProfile) => {
      if (!user) return;
      saveProfile(profile); // the session is saved on the phone straight away
      await outbox.enqueue('PROFILE_SAVED', { profile });
    },
    [user, saveProfile],
  );
}
