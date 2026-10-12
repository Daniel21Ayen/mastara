// apps/mobile/src/core/config/env.ts
import Constants from 'expo-constants';

function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:4001/api/v1`;
    }
  }
  return 'http://localhost:4001/api/v1';
}

export const env = {
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS === 'true',
  /** Encrypt the on-phone database (SQLCipher). Needs a development build; Expo Go cannot do it. */
  dbEncryption: process.env.EXPO_PUBLIC_DB_ENCRYPTION === 'true',
  apiUrl: getApiUrl(),
} as const;
