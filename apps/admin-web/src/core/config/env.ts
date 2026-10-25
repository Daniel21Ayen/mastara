// apps/admin-web/src/core/config/env.ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    'Fatal: Missing NEXT_PUBLIC_API_URL environment variable. Admin portal cannot function without a base API server URL.',
  );
}

export const env = {
  apiUrl: apiUrl.replace(/\/$/, ''),
} as const;
