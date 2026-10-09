// apps/mobile/src/core/session/useRouteGuard.ts
import { usePathname, useRootNavigationState, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect } from 'react';

import { redirectFor } from './routes';
import { useSession } from './SessionProvider';

/** One place decides where the student belongs. Screens never navigate during onboarding themselves. */
export function useRouteGuard(): void {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const navigationReady = Boolean(useRootNavigationState()?.key);

  useEffect(() => {
    if (!navigationReady) return;
    const target = redirectFor(status, pathname);
    if (target) router.replace(target as Href);
  }, [navigationReady, status, pathname, router]);
}
