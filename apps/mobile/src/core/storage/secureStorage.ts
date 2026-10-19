let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

const memoryStore = new Map<string, string>();

export const STORAGE_KEYS = {
  session: 'mastara.session',
  token: 'mastara.token',
  deviceId: 'mastara.deviceId',
  language: 'mastara.language',
  theme: 'mastara.theme',
  dbKey: 'mastara.dbKey',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Thin wrapper over the platform secure store (Android Keystore / iOS Keychain) with memory fallback for test runners. */
export const secureStorage = {
  async getString(key: StorageKey): Promise<string | null> {
    if (SecureStore?.getItemAsync) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        return memoryStore.get(key) ?? null;
      }
    }
    return memoryStore.get(key) ?? null;
  },
  async setString(key: StorageKey, value: string): Promise<void> {
    if (SecureStore?.setItemAsync) {
      try {
        await SecureStore.setItemAsync(key, value);
        return;
      } catch {
        memoryStore.set(key, value);
        return;
      }
    }
    memoryStore.set(key, value);
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
  async setJson<T>(key: StorageKey, value: T): Promise<void> {
    await this.setString(key, JSON.stringify(value));
  },
  async remove(key: StorageKey): Promise<void> {
    if (SecureStore?.deleteItemAsync) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        memoryStore.delete(key);
        return;
      }
    }
    memoryStore.delete(key);
  },
};

