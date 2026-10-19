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
    const res = await httpClient.post<AuthResult>('/auth/login', {
      identifier: input.identifier.trim(),
      password: input.password,
    });
    if (res.token) {
      await httpClient.setToken(res.token);
    }
    return res;
  },
  async register(input) {
    const res = await httpClient.post<AuthResult>('/auth/register', {
      name: input.name.trim(),
      identifier: input.identifier.trim(),
      password: input.password,
    });
    if (res.token) {
      await httpClient.setToken(res.token);
    }
    return res;
  },
  async updateAccount(_user, input) {
    const res = await httpClient.put<{
      id: string;
      name: string;
      identifier: string;
    }>('/profile/account', {
      name: input.name.trim(),
      identifier: input.identifier.trim(),
    });
    return {
      id: res.id,
      name: res.name,
      identifier: res.identifier,
    };
  },
};
