// apps/mobile/src/modules/auth/api/auth.api.ts
import type { AuthResult, EditAccountInput, LoginInput, RegisterInput, User } from '@mastara/contracts';

import { ERROR_CODES } from '@mastara/domain';

import { env } from '@/core/config/env';
import { simulateLatency } from '@/core/mock/delay';
import { ApiError, httpClient, isApiError } from '@/core/network';
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
    // 1. Check local pending credentials (offline registration)
    const pendingSync = await secureStorage.getJson<{ name: string; identifier: string; password: string }>(
      STORAGE_KEYS.pendingRemoteSync,
    );
    if (
      pendingSync &&
      pendingSync.identifier.trim().toLowerCase() === input.identifier.trim().toLowerCase()
    ) {
      if (pendingSync.password === input.password) {
        const user = upsertUser(pendingSync.identifier, pendingSync.name);
        return { user, token: 'local-offline-token' };
      }
      throw new ApiError(ERROR_CODES.UNAUTHORIZED);
    }

    // 2. If not in mock mode, attempt remote login
    if (!env.useMocks) {
      try {
        return await realAuthApi.login(input);
      } catch (err) {
        if (isApiError(err, ERROR_CODES.NETWORK_OFFLINE)) {
          // If offline, check last cached session
          const session = await secureStorage.getJson<{ user: User }>(STORAGE_KEYS.session);
          if (
            session?.user &&
            session.user.identifier.trim().toLowerCase() === input.identifier.trim().toLowerCase()
          ) {
            return { user: session.user, token: 'cached-offline-token' };
          }
          return mockAuthApi.login(input);
        }
        throw err;
      }
    }

    return mockAuthApi.login(input);
  },
  register: async (input) => {
    // Store credentials locally for lazy database sync when student buys paid courses
    // In accordance with policy, student details are not pushed to central DB until purchase
    await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, {
      name: input.name.trim(),
      identifier: input.identifier.trim(),
      password: input.password,
    });

    const user = upsertUser(input.identifier, input.name);
    return { user, token: 'offline-registered-token' };
  },
  updateAccount: (user, input) =>
    env.useMocks ? mockAuthApi.updateAccount(user, input) : realAuthApi.updateAccount(user, input),
};
