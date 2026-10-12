// apps/mobile/src/modules/auth/api/auth.api.ts
import type { AuthResult, EditAccountInput, LoginInput, RegisterInput, User } from '@mastara/contracts';

import { httpClient } from '@/core/network';

export interface AuthApi {
  login(input: LoginInput): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
  /** Changes the name and the phone or email. The account ID stays the same. */
  updateAccount(user: User, input: EditAccountInput): Promise<User>;
}

export const authApi: AuthApi = {
  async login(input) {
    const result = await httpClient.post<AuthResult>('/auth/login', input);
    await httpClient.setToken(result.token);
    return result;
  },
  async register(input) {
    const result = await httpClient.post<AuthResult>('/auth/register', input);
    await httpClient.setToken(result.token);
    return result;
  },
  async updateAccount(_user, input) {
    const updated = await httpClient.put<{ id: string; name: string; identifier: string }>(
      '/profile/account',
      input,
    );
    return {
      id: updated.id,
      name: updated.name,
      identifier: updated.identifier,
    };
  },
};
