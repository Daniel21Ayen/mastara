import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

function getHostFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  const match = uri.match(/^(?:https?|exp):\/\/([^\/:]+)/) || uri.match(/^([^\/:]+)/);
  const host = match ? match[1] : null;
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host;
  }
  return null;
}

function resolveApiUrl(): string {
  const rawUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001';

  // On physical devices or emulators, 'localhost' refers to the phone itself.
  if (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
    // 1. First priority: the exact scriptURL from which the native app loaded the bundle!
    const scriptUrl = NativeModules?.SourceCode?.scriptURL;
    const scriptHost = getHostFromUri(scriptUrl);
    if (scriptHost) {
      return rawUrl.replace(/localhost|127\.0\.0\.1/, scriptHost);
    }

    // 2. Second priority: Expo constants hostUri / debuggerHost / linkingUri
    const expoHost =
      getHostFromUri(Constants?.expoConfig?.hostUri) ??
      getHostFromUri((Constants as any)?.expoGoConfig?.debuggerHost) ??
      getHostFromUri((Constants as any)?.manifest2?.extra?.expoClient?.hostUri) ??
      getHostFromUri((Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost) ??
      getHostFromUri((Constants as any)?.manifest?.debuggerHost) ??
      getHostFromUri(Constants?.linkingUri) ??
      getHostFromUri((Constants as any)?.experienceUrl);

    if (expoHost) {
      return rawUrl.replace(/localhost|127\.0\.0\.1/, expoHost);
    }

    // 3. Fallback for Android emulator
    if (Platform.OS === 'android') {
      return rawUrl.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    }
  }

  return rawUrl;
}

export const env = {
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS === 'true',
  /** Encrypt the on-phone database (SQLCipher). Needs a development build; Expo Go cannot do it. */
  dbEncryption: process.env.EXPO_PUBLIC_DB_ENCRYPTION === 'true',
  /** Block screenshots and screen recording and show the watermark while signed in. Turn off only to capture screenshots for design or support. */
  protectContent: process.env.EXPO_PUBLIC_PROTECT_CONTENT !== 'false',
  apiUrl: resolveApiUrl(),
} as const;
