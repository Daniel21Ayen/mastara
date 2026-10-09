// apps/mobile/app.config.ts
import type { ExpoConfig } from 'expo/config';

// The encrypted database (SQLCipher) needs a development build; Expo Go cannot run it.
const encryptDatabase = process.env.EXPO_PUBLIC_DB_ENCRYPTION === 'true';

const config: ExpoConfig = {
  name: 'Mastara',
  slug: 'mastara',
  scheme: 'mastara',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: { package: 'com.kewakibt.mastara' },
  ios: { bundleIdentifier: 'com.kewakibt.mastara' },
  plugins: [
    'expo-router',
    ['expo-image-picker', { photosPermission: 'Mastara needs your photos to attach a payment receipt.' }],
    ...(encryptDatabase ? ([['expo-sqlite', { useSQLCipher: true }]] as [string, object][]) : []),
  ],
  experiments: { typedRoutes: true },
};

export default config;
