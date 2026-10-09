// apps/mobile/src/modules/auth/hooks/useAuth.ts
import type { AuthResult, LoginInput, RegisterInput } from '@mastara/contracts';
import { ERROR_CODES } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
import { useCallback, useState } from 'react';

import { isApiError } from '@/core/network';
import { useSession } from '@/core/session';
import { profileApi } from '@/modules/profile';

import { authApi } from '../api/auth.api';

/** Signs in or registers, loads any saved profile, then hands the result to the session. */
export function useAuth() {
  const { signIn } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const run = useCallback(
    async (action: () => Promise<AuthResult>) => {
      setLoading(true);
      setError(null);
      try {
        const { user } = await action();
        const profile = await profileApi.getProfile(user.id);
        signIn(user, profile); // the route guard moves the student to the next step
      } catch (cause) {
        setError(isApiError(cause, ERROR_CODES.NETWORK_OFFLINE) ? 'error.offline' : 'error.generic');
      } finally {
        setLoading(false);
      }
    },
    [signIn],
  );

  return {
    loading,
    error,
    login: (input: LoginInput) => run(() => authApi.login(input)),
    register: (input: RegisterInput) => run(() => authApi.register(input)),
  };
}
