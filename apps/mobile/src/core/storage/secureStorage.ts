// apps/mobile/src/core/storage/secureStorage.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  session: 'mastara.session',
  token: 'mastara.token',
  deviceId: 'mastara.deviceId',
  language: 'mastara.language',
  theme: 'mastara.theme',
  dbKey: 'mastara.dbKey',
  pendingRemoteSync: 'mastara.pendingRemoteSync',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function getWebStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/** Thin wrapper over the platform secure store (Android Keystore / iOS Keychain), with localStorage fallback on web. */
export const secureStorage = {
  getString(key: StorageKey): Promise<string | null> {
    if (Platform.OS === 'web') {
      return Promise.resolve(getWebStorage()?.getItem(key) ?? null);
    }
    return SecureStore.getItemAsync(key);
  },
  setString(key: StorageKey, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      getWebStorage()?.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  async getJson<T>(key: StorageKey): Promise<T | null> {
    const raw = await this.getString(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJson<T>(key: StorageKey, value: T): Promise<void> {
    return this.setString(key, JSON.stringify(value));
  },
  remove(key: StorageKey): Promise<void> {
    if (Platform.OS === 'web') {
      getWebStorage()?.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

