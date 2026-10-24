// apps/mobile/src/core/storage/secureStorage.ts

export const STORAGE_KEYS = {
  session: 'mastara.session',
  token: 'mastara.token',
  deviceId: 'mastara.deviceId',
  language: 'mastara.language',
  theme: 'mastara.theme',
  dbKey: 'mastara.dbKey',
  pendingRemoteSync: 'mastara.pendingRemoteSync',
  offlineUsers: 'mastara.offlineUsers',
  authLockout: 'mastara.authLockout',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function getWebStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

const isNative =
  typeof navigator !== 'undefined' &&
  (navigator as any).product === 'ReactNative';

let SecureStore: typeof import('expo-secure-store') | null = null;
if (isNative) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SecureStore = require('expo-secure-store');
  } catch {
    SecureStore = null;
  }
}

const memoryStore = new Map<string, string>();

/** Thin wrapper over the platform secure store (Android Keystore / iOS Keychain), with localStorage fallback on web and memory fallback in test. */
export const secureStorage = {
  getString(key: StorageKey): Promise<string | null> {
    const webStorage = getWebStorage();
    if (webStorage) {
      return Promise.resolve(webStorage.getItem(key) ?? null);
    }
    if (SecureStore?.getItemAsync) {
      return SecureStore.getItemAsync(key).catch(() => memoryStore.get(key) ?? null);
    }
    return Promise.resolve(memoryStore.get(key) ?? null);
  },
  setString(key: StorageKey, value: string): Promise<void> {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(key, value);
      return Promise.resolve();
    }
    if (SecureStore?.setItemAsync) {
      return SecureStore.setItemAsync(key, value).catch(() => {
        memoryStore.set(key, value);
      });
    }
    memoryStore.set(key, value);
    return Promise.resolve();
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
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(key);
      return Promise.resolve();
    }
    if (SecureStore?.deleteItemAsync) {
      return SecureStore.deleteItemAsync(key).catch(() => {
        memoryStore.delete(key);
      });
    }
    memoryStore.delete(key);
    return Promise.resolve();
  },
};

