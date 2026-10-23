// apps/mobile/src/core/config/env.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveApiUrl(): string {
  const rawUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001';
  if (Platform.OS === 'web') {
    return rawUrl;
  }

  // On physical devices or emulators, 'localhost' refers to the phone itself.
  if (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
    // 1. In Expo Go or development client, hostUri provides the computer's network IP (e.g. 172.16.131.46)
    const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp) {
        return rawUrl.replace(/localhost|127\.0\.0\.1/, hostIp);
      }
    }

    // 2. Fallback for Android emulator
    if (Platform.OS === 'android') {
      return rawUrl.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    }
  }

  return rawUrl;
}

export const env = {
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS !== 'false',
  /** Encrypt the on-phone database (SQLCipher). Needs a development build; Expo Go cannot do it. */
  dbEncryption: process.env.EXPO_PUBLIC_DB_ENCRYPTION === 'true',
  /** Block screenshots and screen recording and show the watermark while signed in. Turn off only to capture screenshots for design or support. */
  protectContent: process.env.EXPO_PUBLIC_PROTECT_CONTENT !== 'false',
  apiUrl: resolveApiUrl(),
} as const;
