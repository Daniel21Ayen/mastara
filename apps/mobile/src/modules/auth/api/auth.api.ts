// apps/mobile/src/modules/auth/api/auth.api.ts
import type { AuthResult, EditAccountInput, LoginInput, RegisterInput, User } from '@mastara/contracts';

import { env } from '@/core/config/env';
import { simulateLatency } from '@/core/mock/delay';

export interface AuthApi {
  login(input: LoginInput): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
  /** Changes the name and the phone or email. The account ID stays the same. */
  updateAccount(user: User, input: EditAccountInput): Promise<User>;
}

// Mock server memory: lives until the app process ends.
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

function createAuthApi(): AuthApi {
  if (env.useMocks) return mockAuthApi;
  throw new Error('The real auth API is added in the backend integration phase.');
}

export const authApi = createAuthApi();
