// apps/mobile/src/modules/auth/api/auth.api.ts
import type { AuthResult, EditAccountInput, LoginInput, RegisterInput, User } from '@mastara/contracts';
import { ERROR_CODES } from '@mastara/domain';

import { env } from '@/core/config/env';
import { ApiError, httpClient, isApiError } from '@/core/network';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import {
  hashPassword,
  verifyPassword,
  PasswordHashRecord,
} from '../lib/offlineCrypto';
import {
  checkLockout,
  recordFailedAttempt,
  clearLockout,
} from '../lib/loginLockout';

export interface AuthApi {
  login(input: LoginInput): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
  /** Changes the name and the phone or email. The account ID stays the same. */
  updateAccount(user: User, input: EditAccountInput): Promise<User>;
}

export interface PendingStudentSync {
  userId: string;
  localAccountId?: string;
  name: string;
  identifier: string;
  password?: string;               // Legacy plaintext (erased upon first successful login)
  passwordHash?: PasswordHashRecord; // Cryptographically salted PBKDF2-SHA256 hash
  profile?: any;
  purchased?: boolean;
}

// Development mock memory (Only used in dev when explicitly configured)
const mockUsers = new Map<string, User>();

function userKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function upsertUser(identifier: string, name?: string): User {
  const key = userKey(identifier);
  const existing = mockUsers.get(key);
  const user: User = {
    id: `u-${key}`,
    identifier: identifier.trim(),
    name: name ?? existing?.name ?? key.split('@')[0] ?? key,
  };
  mockUsers.set(key, user);
  return user;
}

export const realAuthApi: AuthApi & { register(input: RegisterInput & { localAccountId?: string }): Promise<AuthResult> } = {
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
      localAccountId: input.localAccountId,
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

/**
 * Verify account password offline:
 * Supports modern salted PBKDF2-SHA256 and migrates legacy plaintext passwords on successful login.
 */
async function verifyOfflineAccountPassword(
  inputPassword: string,
  account: PendingStudentSync,
  onMigrated?: () => Promise<void>,
): Promise<boolean> {
  // Case 1: Modern salted PBKDF2 hash
  if (account.passwordHash) {
    return verifyPassword(inputPassword, account.passwordHash);
  }

  // Case 2: Legacy plaintext password migration
  if (account.password && typeof account.password === 'string') {
    if (account.password === inputPassword) {
      // Migrate immediately to salted PBKDF2 hash and erase plaintext password permanently
      account.passwordHash = await hashPassword(inputPassword);
      delete account.password;
      if (onMigrated) {
        await onMigrated();
      }
      return true;
    }
    return false;
  }

  return false;
}

export const authApi: AuthApi = {
  login: async (input) => {
    const norm = input.identifier.trim().toLowerCase();

    // 1. Enforce attempt lockout with backoff
    const { locked, remainingSeconds } = await checkLockout(input.identifier);
    if (locked) {
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED,
        `Too many failed login attempts. Please wait ${remainingSeconds} seconds before trying again.`,
      );
    }

    // 2. Check local offline accounts registry
    const registry =
      (await secureStorage.getJson<Record<string, PendingStudentSync>>(STORAGE_KEYS.offlineUsers)) || {};
    const localAccount = registry[norm];

    // If student registered offline and has not yet purchased content
    if (localAccount && !localAccount.purchased) {
      const isValid = await verifyOfflineAccountPassword(input.password, localAccount, async () => {
        // Save migrated account back to secure storage with plaintext erased
        registry[norm] = localAccount;
        await secureStorage.setJson(STORAGE_KEYS.offlineUsers, registry);
        await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, localAccount);
      });

      if (isValid) {
        await clearLockout(input.identifier);
        const user = upsertUser(localAccount.identifier, localAccount.name);
        await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, localAccount);
        return { user, token: 'local-offline-token' };
      }

      await recordFailedAttempt(input.identifier);
      throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');
    }

    // 3. Central database login via TLS (online check)
    if (!env.useMocks) {
      try {
        const result = await realAuthApi.login(input);
        await clearLockout(input.identifier);
        return result;
      } catch (err) {
        if (isApiError(err, ERROR_CODES.NETWORK_OFFLINE)) {
          // If network is offline, check cached session with verified offline account
          if (localAccount) {
            const isValid = await verifyOfflineAccountPassword(input.password, localAccount, async () => {
              registry[norm] = localAccount;
              await secureStorage.setJson(STORAGE_KEYS.offlineUsers, registry);
            });

            if (isValid) {
              await clearLockout(input.identifier);
              const user = upsertUser(localAccount.identifier, localAccount.name);
              return { user, token: 'cached-offline-token' };
            }
          }

          // Check cached session
          const session = await secureStorage.getJson<{ user: User }>(STORAGE_KEYS.session);
          if (session?.user && session.user.identifier.trim().toLowerCase() === norm) {
            // Note: If no hashed offline credentials match, offline login must NOT succeed
            await recordFailedAttempt(input.identifier);
            throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Invalid offline credentials');
          }

          // NO mockAuthApi fallback when offline!
          await recordFailedAttempt(input.identifier);
          throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Offline credentials verification failed');
        }

        // If online error (e.g. wrong password from server), record failure
        await recordFailedAttempt(input.identifier);
        throw err;
      }
    }

    // Dev mock mode only (only when env.useMocks is explicitly true in development)
    if (__DEV__ && env.useMocks) {
      return { user: upsertUser(input.identifier), token: 'mock-token' };
    }

    throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');
  },

  register: async (input) => {
    const norm = input.identifier.trim().toLowerCase();
    const user = upsertUser(input.identifier, input.name);

    // Compute cryptographically secure salted PBKDF2 hash
    const passwordHash = await hashPassword(input.password);

    // Store credentials locally with NO plaintext password.
    // When the student purchases, the password is provided over TLS to server directly.
    const localAccountId =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `loc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const record: PendingStudentSync = {
      userId: user.id,
      localAccountId,
      name: input.name.trim(),
      identifier: input.identifier.trim(),
      passwordHash,
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

    if (__DEV__ && env.useMocks) {
      mockUsers.set(userKey(updatedUser.identifier), updatedUser);
      return updatedUser;
    }

    return realAuthApi.updateAccount(user, input);
  },
};
