// apps/mobile/src/core/config/env.ts
import Constants from 'expo-constants';

function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as Record<string, any>).manifest?.debuggerHost ??
    (Constants as Record<string, any>).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.includes('exp.direct') && !host.includes('ngrok')) {
      return `http://${host}:4001/api/v1`;
    }
  }
  return 'http://192.168.73.116:4001/api/v1';
}

export const env = {
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS === 'true',
  /** Encrypt the on-phone database (SQLCipher). Needs a development build; Expo Go cannot do it. */
  dbEncryption: process.env.EXPO_PUBLIC_DB_ENCRYPTION === 'true',
  /** Block screenshots and screen recording and show the watermark while signed in. Turn off only to capture screenshots for design or support. */
  protectContent: process.env.EXPO_PUBLIC_PROTECT_CONTENT !== 'false',
  apiUrl: getApiUrl(),
} as const;
