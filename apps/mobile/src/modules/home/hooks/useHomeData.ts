// apps/mobile/src/modules/home/hooks/useHomeData.ts
import { useSession } from '@/core/session';
import { useAsync } from '@/shared/hooks';

import { homeApi } from '../api/home.api';

/** Loads the Home summary for the signed-in student's profile. */
export function useHomeData() {
  const { user, profile } = useSession();
  return useAsync(user && profile ? () => homeApi.getSummary(user.id, profile) : null, [user, profile]);
}
