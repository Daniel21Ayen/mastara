// apps/mobile/src/core/storage/secureStorage.ts
import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  session: 'mastara.session',
  token: 'mastara.token',
  deviceId: 'mastara.deviceId',
  language: 'mastara.language',
  theme: 'mastara.theme',
  dbKey: 'mastara.dbKey',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Thin wrapper over the platform secure store (Android Keystore / iOS Keychain). */
export const secureStorage = {
  getString(key: StorageKey): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  setString(key: StorageKey, value: string): Promise<void> {
    return SecureStore.setItemAsync(key, value);
  },
  async getJson<T>(key: StorageKey): Promise<T | null> {
    const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJson<T>(key: StorageKey, value: T): Promise<void> {
    return SecureStore.setItemAsync(key, JSON.stringify(value));
  },
  remove(key: StorageKey): Promise<void> {
    return SecureStore.deleteItemAsync(key);
  },
};
