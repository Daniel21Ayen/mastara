// apps/mobile/src/modules/home/hooks/useHomeData.ts
import { useSession } from '@/core/session';
import { useAsync } from '@/shared/hooks';

import { homeApi } from '../api/home.api';

/** Loads the Home summary for the signed-in student's profile. */
export function useHomeData() {
  const { user, profile } = useSession();
  return useAsync(
    async () => {
      if (user && profile) {
        return homeApi.getSummary(user.id, profile);
      }
      return {
        chaptersDone: 0,
        chaptersTotal: 0,
        activeProducts: 0,
        pendingProducts: 0,
        recent: [],
      };
    },
    [user?.id, profile?.courseIds?.join(',')],
  );
}
