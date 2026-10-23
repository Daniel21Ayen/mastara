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

export interface PendingStudentSync {
  userId: string;
  name: string;
  identifier: string;
  password: string;
  profile?: any;
  purchased?: boolean;
}

export const authApi: AuthApi = {
  login: async (input) => {
    const norm = input.identifier.trim().toLowerCase();

    // 1. Check local offline accounts registry
    const registry =
      (await secureStorage.getJson<Record<string, PendingStudentSync>>(STORAGE_KEYS.offlineUsers)) || {};
    const localAccount = registry[norm];

    // If student registered offline and has not yet purchased content
    if (localAccount && !localAccount.purchased) {
      if (localAccount.password === input.password) {
        const user = upsertUser(localAccount.identifier, localAccount.name);
        await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, localAccount);
        return { user, token: 'local-offline-token' };
      }
      throw new ApiError(ERROR_CODES.UNAUTHORIZED);
    }

    // 2. Also check pendingRemoteSync directly
    const pendingSync = await secureStorage.getJson<PendingStudentSync>(STORAGE_KEYS.pendingRemoteSync);
    if (pendingSync && pendingSync.identifier.trim().toLowerCase() === norm && !pendingSync.purchased) {
      if (pendingSync.password === input.password) {
        const user = upsertUser(pendingSync.identifier, pendingSync.name);
        return { user, token: 'local-offline-token' };
      }
      throw new ApiError(ERROR_CODES.UNAUTHORIZED);
    }

    // 3. Central database login (for purchased accounts or online checks)
    if (!env.useMocks) {
      try {
        return await realAuthApi.login(input);
      } catch (err) {
        if (isApiError(err, ERROR_CODES.NETWORK_OFFLINE)) {
          // If offline, check last cached session or offline registry
          if (localAccount && localAccount.password === input.password) {
            const user = upsertUser(localAccount.identifier, localAccount.name);
            return { user, token: 'cached-offline-token' };
          }
          const session = await secureStorage.getJson<{ user: User }>(STORAGE_KEYS.session);
          if (session?.user && session.user.identifier.trim().toLowerCase() === norm) {
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
    const norm = input.identifier.trim().toLowerCase();
    const user = upsertUser(input.identifier, input.name);

    // Store credentials locally for lazy database sync when student buys paid courses.
    // In accordance with policy, student details are not pushed to central DB until purchase.
    const record: PendingStudentSync = {
      userId: user.id,
      name: input.name.trim(),
      identifier: input.identifier.trim(),
      password: input.password,
      purchased: false,
    };

    await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, record);

    const registry =
      (await secureStorage.getJson<Record<string, PendingStudentSync>>(STORAGE_KEYS.offlineUsers)) || {};
    registry[norm] = record;
    await secureStorage.setJson(STORAGE_KEYS.offlineUsers, registry);

    return { user, token: 'offline-registered-token' };
  },
  updateAccount: async (user, input) => {
    const norm = user.identifier.trim().toLowerCase();
    const updatedUser = {
      ...user,
      name: input.name.trim(),
      identifier: input.identifier.trim(),
    };

    // If student is pending purchase (unpurchased), update local offline records only
    const pendingSync = await secureStorage.getJson<PendingStudentSync>(STORAGE_KEYS.pendingRemoteSync);
    if (pendingSync && !pendingSync.purchased) {
      pendingSync.name = updatedUser.name;
      pendingSync.identifier = updatedUser.identifier;
      await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, pendingSync);

      const registry =
        (await secureStorage.getJson<Record<string, PendingStudentSync>>(STORAGE_KEYS.offlineUsers)) || {};
      if (registry[norm]) {
        delete registry[norm];
        registry[updatedUser.identifier.toLowerCase()] = pendingSync;
        await secureStorage.setJson(STORAGE_KEYS.offlineUsers, registry);
      }
      return updatedUser;
    }

    if (env.useMocks) {
      return mockAuthApi.updateAccount(user, input);
    }
    return realAuthApi.updateAccount(user, input);
  },
};
