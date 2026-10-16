// apps/admin-web/src/modules/auth/api/auth.api.ts
import { adminAuthResultSchema } from '@mastara/contracts';
import type { AdminAuthResult, AdminLoginInput } from '@mastara/contracts';
import { ADMIN_ERROR_CODES } from '@mastara/domain';

import { env } from '@/core/config/env';
import { simulateLatency } from '@/core/mock/delay';
import { MOCK_ADMIN_ACCOUNTS } from '@/core/mock/data';
import { ApiError } from '@/core/network';

export interface AdminAuthApi {
  /** Signs an admin in. Fails with UNAUTHORIZED for a wrong identifier or password. */
  login(input: AdminLoginInput): Promise<AdminAuthResult>;
}

const mockAdminAuthApi: AdminAuthApi = {
  async login({ identifier, password }) {
    await simulateLatency(300);
    const key = identifier.trim().toLowerCase();
    const account = MOCK_ADMIN_ACCOUNTS.find(
      (candidate) =>
        candidate.user.identifier.toLowerCase() === key && candidate.password === password,
    );
    if (!account) throw new ApiError(ADMIN_ERROR_CODES.UNAUTHORIZED);
    return adminAuthResultSchema.parse({
      user: account.user,
      token: `mock-admin-token-${account.user.id}`,
    });
  },
};

function createAdminAuthApi(): AdminAuthApi {
  if (env.useMocks) return mockAdminAuthApi;
  throw new Error('The real admin auth API is added in the backend integration phase.');
}

export const adminAuthApi = createAdminAuthApi();
