// apps/admin-web/src/modules/auth/api/auth.api.ts
import { adminAuthResultSchema } from '@mastara/contracts';
import type { AdminAuthResult, AdminLoginInput } from '@mastara/contracts';
import { httpClient } from '@/core/network';

export interface AdminAuthApi {
  /** Signs an admin in. Fails with UNAUTHORIZED for a wrong identifier or password. */
  login(input: AdminLoginInput): Promise<AdminAuthResult>;
}

export const realAdminAuthApi: AdminAuthApi = {
  async login(input) {
    const result = await httpClient.post<AdminAuthResult>('/auth/admin/login', input);
    return adminAuthResultSchema.parse(result);
  },
};

export const adminAuthApi: AdminAuthApi = realAdminAuthApi;
