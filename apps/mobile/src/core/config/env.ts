// apps/mobile/src/core/config/env.ts
export const env = {
  useMocks: process.env.EXPO_PUBLIC_USE_MOCKS !== 'false',
  /** Encrypt the on-phone database (SQLCipher). Needs a development build; Expo Go cannot do it. */
  dbEncryption: process.env.EXPO_PUBLIC_DB_ENCRYPTION === 'true',
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
} as const;
