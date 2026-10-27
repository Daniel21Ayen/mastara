// apps/mobile/src/modules/auth/api/auth.api.ts
import type { AuthResult, EditAccountInput, LoginInput, RegisterInput, User } from '@mastara/contracts';
import { ERROR_CODES } from '@mastara/domain';

import { migrateLocalUserToStudentId } from '@/core/db';
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

export type AccountState = 'LOCAL_ONLY' | 'REGISTERED_REMOTE';

export interface PendingStudentSync {
  userId: string;
  localAccountId: string;
  accountState: AccountState;
  name: string;
  identifier: string;
  password?: string;               // Legacy plaintext (erased upon first successful login)
  passwordHash?: PasswordHashRecord; // Cryptographically salted PBKDF2-SHA256 hash
  profile?: any;
  purchased?: boolean;
}

export interface AuthApi {
  login(input: LoginInput): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
  /** Changes the name and the phone or email. The account ID stays the same. */
  updateAccount(user: User, input: EditAccountInput): Promise<User>;
}

export async function getAccountState(): Promise<AccountState | 'NONE'> {
  const pendingSync = await secureStorage.getJson<PendingStudentSync>(STORAGE_KEYS.pendingRemoteSync);
  if (!pendingSync) return 'NONE';
  return pendingSync.accountState ?? (pendingSync.purchased ? 'REGISTERED_REMOTE' : 'LOCAL_ONLY');
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
    const res = await httpClient.post<AuthResult>('/auth/register-offline', {
      name: input.name.trim(),
      identifier: input.identifier.trim(),
      password: input.password,
      localAccountId: 'localAccountId' in input ? (input as { localAccountId?: string }).localAccountId : undefined,
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

    // If account is LOCAL_ONLY (registered offline and hasn't made first purchase yet)
    if (localAccount && (localAccount.accountState === 'LOCAL_ONLY' || !localAccount.purchased)) {
      const isValid = await verifyOfflineAccountPassword(input.password, localAccount, async () => {
        registry[norm] = localAccount;
        await secureStorage.setJson(STORAGE_KEYS.offlineUsers, registry);
        await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, localAccount);
      });

      if (isValid) {
        await clearLockout(input.identifier);
        const user: User = {
          id: localAccount.userId,
          name: localAccount.name,
          identifier: localAccount.identifier,
        };
        await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, localAccount);
        return { user, token: 'local-offline-token' };
      }

      await recordFailedAttempt(input.identifier);
      throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Invalid credentials');
    }

    // 3. Central database login via real API client
    try {
      const result = await realAuthApi.login(input);
      await clearLockout(input.identifier);

      // REG-16: If there is an existing local-only account on this device, merge local progress into recovered account
      const currentSync = await secureStorage.getJson<PendingStudentSync>(STORAGE_KEYS.pendingRemoteSync);
      if (
        currentSync &&
        (currentSync.accountState === 'LOCAL_ONLY' || !currentSync.purchased) &&
        currentSync.userId &&
        currentSync.userId !== result.user.id
      ) {
        try {
          await migrateLocalUserToStudentId(currentSync.userId, result.user.id);
        } catch {
          // preserve recovery login even if local migration encounters partial tables
        }
      }

      await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, {
        userId: result.user.id,
        localAccountId: result.user.id,
        name: result.user.name,
        identifier: result.user.identifier,
        accountState: 'REGISTERED_REMOTE',
        purchased: true,
      });

      return result;
    } catch (err) {
      if (isApiError(err, ERROR_CODES.NETWORK_OFFLINE)) {
        // If network is offline, check cached verified offline account
        if (localAccount) {
          const isValid = await verifyOfflineAccountPassword(input.password, localAccount, async () => {
            registry[norm] = localAccount;
            await secureStorage.setJson(STORAGE_KEYS.offlineUsers, registry);
          });

          if (isValid) {
            await clearLockout(input.identifier);
            const user: User = {
              id: localAccount.userId,
              name: localAccount.name,
              identifier: localAccount.identifier,
            };
            return { user, token: 'cached-offline-token' };
          }
        }

        // Check cached session
        const session = await secureStorage.getJson<{ user: User }>(STORAGE_KEYS.session);
        if (session?.user && session.user.identifier.trim().toLowerCase() === norm) {
          await recordFailedAttempt(input.identifier);
          throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Invalid offline credentials');
        }

        await recordFailedAttempt(input.identifier);
        throw new ApiError(ERROR_CODES.UNAUTHORIZED, 'Offline credentials verification failed');
      }

      await recordFailedAttempt(input.identifier);
      throw err;
    }
  },

  register: async (input) => {
    const norm = input.identifier.trim().toLowerCase();

    // Compute cryptographically secure salted PBKDF2 hash
    const passwordHash = await hashPassword(input.password);

    const localAccountId =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

    const userId = localAccountId;
    const user: User = {
      id: userId,
      name: input.name.trim(),
      identifier: input.identifier.trim(),
    };

    // Stored with explicit LOCAL_ONLY state. Zero network requests made (REG-01, REG-02).
    const record: PendingStudentSync = {
      userId,
      localAccountId,
      accountState: 'LOCAL_ONLY',
      name: input.name.trim(),
      identifier: input.identifier.trim(),
      passwordHash,
      purchased: false,
    };

    await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, record);
    await secureStorage.setString(STORAGE_KEYS.pendingPassword, input.password);

    const registry =
      (await secureStorage.getJson<Record<string, PendingStudentSync>>(STORAGE_KEYS.offlineUsers)) || {};
    registry[norm] = record;
    await secureStorage.setJson(STORAGE_KEYS.offlineUsers, registry);

    return { user, token: 'local-offline-token' };
  },

  updateAccount: async (user, input) => {
    const norm = user.identifier.trim().toLowerCase();
    const updatedUser = {
      ...user,
      name: input.name.trim(),
      identifier: input.identifier.trim(),
    };

    // If student is LOCAL_ONLY, update local offline records only. ZERO network requests!
    const pendingSync = await secureStorage.getJson<PendingStudentSync>(STORAGE_KEYS.pendingRemoteSync);
    if (pendingSync && (pendingSync.accountState === 'LOCAL_ONLY' || !pendingSync.purchased)) {
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

    return realAuthApi.updateAccount(user, input);
  },
};
