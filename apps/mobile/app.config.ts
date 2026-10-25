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
  userInterfaceStyle: 'automatic',
  android: { package: 'com.kewakibt.mastara' },
  ios: { bundleIdentifier: 'com.kewakibt.mastara' },
  platforms: ['android', 'ios', 'web'],
  plugins: [
    'expo-router',
    [
      // Size controls for the Android release build (hard limit: 20 MB, see docs/APP-SIZE.md).
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: true, // R8: removes unused code and shortens the rest
          enableShrinkResourcesInReleaseBuilds: true, // removes unused images and layouts
          useLegacyPackaging: true, // compress native libraries inside the APK (smaller file; slightly larger once installed)
        },
      },
    ],
    ['expo-image-picker', { photosPermission: 'Mastara needs your photos to attach a payment receipt.' }],
    ...(encryptDatabase ? ([['expo-sqlite', { useSQLCipher: true }]] as [string, object][]) : []),
    './plugins/withExpoPatches.js',
  ],
  experiments: { typedRoutes: true },
};

export default config;
