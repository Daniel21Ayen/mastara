// apps/mobile/src/modules/profile/hooks/useSaveProfile.ts
import type { StudentProfile } from '@mastara/contracts';
import { useCallback } from 'react';

import { useSession } from '@/core/session';
import { outbox, syncCatalog } from '@/core/sync';

import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import type { PendingStudentSync } from '@/modules/auth/api/auth.api';

/**
 * Saves the profile (including the course list) the offline-first way:
 * Updated profile data must not be inserted/saved to the database until they purchase content.
 * For unpurchased students, it is saved locally only.
 */
export function useSaveProfile() {
  const { user, saveProfile } = useSession();

  return useCallback(
    async (profile: StudentProfile) => {
      if (!user) return;
      saveProfile(profile); // the session is saved on the phone straight away

      // Trigger catalog sync after course selection / profile update
      void syncCatalog(user.id, true).catch(() => undefined);

      // If student has not yet purchased content, save profile locally only
      // Do NOT insert or save to central database until they purchase content
      const pendingSync = await secureStorage.getJson<PendingStudentSync>(STORAGE_KEYS.pendingRemoteSync);
      if (pendingSync && !pendingSync.purchased) {
        pendingSync.profile = profile;
        await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, pendingSync);

        // Also update offline users registry
        const registry =
          (await secureStorage.getJson<Record<string, PendingStudentSync>>(STORAGE_KEYS.offlineUsers)) || {};
        const norm = (user.identifier || pendingSync.identifier).trim().toLowerCase();
        if (registry[norm]) {
          registry[norm].profile = profile;
          await secureStorage.setJson(STORAGE_KEYS.offlineUsers, registry);
        }
        return;
      }

      await outbox.enqueue('PROFILE_SAVED', { profile });
    },
    [user, saveProfile],
  );
}
