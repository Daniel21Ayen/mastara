// apps/mobile/src/core/config/env.ts

function getHostFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  const match = uri.match(/^(?:https?|exp):\/\/([^\/:]+)/) || uri.match(/^([^\/:]+)/);
  const host = match ? match[1] : null;
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host;
  }
  return null;
}

let resolvedHost: string | null = null;

/** True in a release build (Hermes sets __DEV__ to false). Tests and tooling running under Node count as development. */
const isProductionBuild = typeof __DEV__ !== 'undefined' && __DEV__ === false;

function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (isProductionBuild && (!configured || /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(configured))) {
    // A release build must never talk to the developer's machine. Fail fast and visibly instead of spinning forever.
    throw new Error('EXPO_PUBLIC_API_URL must be set to the public https API address for release builds.');
  }
  if (isProductionBuild && configured && !configured.startsWith('https://')) {
    throw new Error('EXPO_PUBLIC_API_URL must use https:// in release builds.');
  }
  const rawUrl = configured ?? 'http://localhost:4001';

  // In Node.js testing/CLI environments, avoid loading React Native native bindings
  if (typeof process !== 'undefined' && process.versions?.node && !process.env.JEST_WORKER_ID && process.env.NODE_TEST_CONTEXT) {
    return rawUrl;
  }

  try {
    // Dynamic access so node/tsx runner in tests doesn't choke on Flow typings in react-native/index.js
    const RN = typeof require !== 'undefined' ? require('react-native') : null;
    const Platform = RN?.Platform;
    const NativeModules = RN?.NativeModules;

    if (!Platform || Platform.OS === 'web') {
      return rawUrl;
    }

    if (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
      if (resolvedHost) {
        return rawUrl.replace(/localhost|127\.0\.0\.1/, resolvedHost);
      }

      const scriptUrl = NativeModules?.SourceCode?.scriptURL;
      const scriptHost = getHostFromUri(scriptUrl);
      if (scriptHost) {
        resolvedHost = scriptHost;
        return rawUrl.replace(/localhost|127\.0\.0\.1/, scriptHost);
      }

      let Constants: any = null;
      try {
        Constants = typeof require !== 'undefined' ? require('expo-constants')?.default ?? require('expo-constants') : null;
      } catch {
        // Fallback if expo-constants is unavailable
      }

      const expoHost =
        getHostFromUri(Constants?.expoConfig?.hostUri) ??
        getHostFromUri(Constants?.expoGoConfig?.debuggerHost) ??
        getHostFromUri(Constants?.manifest2?.extra?.expoClient?.hostUri) ??
        getHostFromUri(Constants?.manifest2?.extra?.expoGo?.debuggerHost) ??
        getHostFromUri(Constants?.manifest?.debuggerHost) ??
        getHostFromUri(Constants?.linkingUri) ??
        getHostFromUri(Constants?.experienceUrl);

      if (expoHost) {
        resolvedHost = expoHost;
        return rawUrl.replace(/localhost|127\.0\.0\.1/, expoHost);
      }

      const isDevice = Constants?.isDevice ?? false;
      if (Platform.OS === 'android' && !isDevice) {
        return rawUrl.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
      }
    }
  } catch {
    return rawUrl;
  }

  return rawUrl;
}

export const env = {
  /** Encrypt the on-phone database (SQLCipher). Needs a development build; Expo Go cannot do it. */
  dbEncryption: process.env.EXPO_PUBLIC_DB_ENCRYPTION === 'true',
  /** Block screenshots and screen recording and show the watermark while signed in. Turn off only to capture screenshots for design or support. */
  protectContent: process.env.EXPO_PUBLIC_PROTECT_CONTENT !== 'false',
  get apiUrl(): string {
    return resolveApiUrl();
  },
} as const;
