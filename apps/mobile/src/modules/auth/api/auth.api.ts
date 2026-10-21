// apps/mobile/src/modules/auth/api/auth.api.ts
import type { AuthResult, EditAccountInput, LoginInput, RegisterInput, User } from '@mastara/contracts';

import { ERROR_CODES } from '@mastara/domain';

import { env } from '@/core/config/env';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient, isApiError } from '@/core/network';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

export interface AuthApi {
  login(input: LoginInput): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
  /** Changes the name and the phone or email. The account ID stays the same. */
  updateAccount(user: User, input: EditAccountInput): Promise<User>;
}

// Mock/offline memory
const users = new Map<string, User>();

function userKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function upsertUser(identifier: string, name?: string): User {
  const key = userKey(identifier);
  const existing = users.get(key);
  const user: User = {
    id: `u-${key}`,
    identifier: identifier.trim(),
    name: name ?? existing?.name ?? key.split('@')[0] ?? key,
  };
  users.set(key, user);
  return user;
}

const mockAuthApi: AuthApi = {
  async updateAccount(user, input) {
    await simulateLatency();
    const updated: User = { ...user, name: input.name.trim(), identifier: input.identifier.trim() };
    users.set(userKey(updated.identifier), updated);
    return updated;
  },
  async login({ identifier }) {
    await simulateLatency();
    return { user: upsertUser(identifier), token: 'mock-token' };
  },
  async register({ identifier, name }) {
    await simulateLatency();
    return { user: upsertUser(identifier, name), token: 'mock-token' };
  },
};

export const realAuthApi: AuthApi = {
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

export const authApi: AuthApi = {
  login: async (input) => {
    if (env.useMocks) return mockAuthApi.login(input);
    try {
      return await realAuthApi.login(input);
    } catch (err) {
      if (isApiError(err, ERROR_CODES.NETWORK_OFFLINE)) {
        return mockAuthApi.login(input);
      }
      throw err;
    }
  },
  register: async (input) => {
    // Store credentials for lazy database sync when student buys paid courses online
    await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, {
      name: input.name.trim(),
      identifier: input.identifier.trim(),
      password: input.password,
    });

    if (env.useMocks) return mockAuthApi.register(input);
    try {
      const res = await realAuthApi.register(input);
      // Already registered on remote database
      await secureStorage.remove(STORAGE_KEYS.pendingRemoteSync);
      return res;
    } catch (err) {
      if (isApiError(err, ERROR_CODES.NETWORK_OFFLINE)) {
        // Create offline user account so onboarding continues without error
        return mockAuthApi.register(input);
      }
      throw err;
    }
  },
  updateAccount: (user, input) =>
    env.useMocks ? mockAuthApi.updateAccount(user, input) : realAuthApi.updateAccount(user, input),
};
