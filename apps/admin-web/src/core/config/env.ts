// apps/admin-web/src/core/config/env.ts
export const env = {
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS !== 'false',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
} as const;
