// apps/admin-web/next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Required for the production Docker image (copies only what's needed)
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  // The shared packages export TypeScript source, so Next must compile them.
  transpilePackages: [
    '@mastara/contracts',
    '@mastara/domain',
    '@mastara/i18n',
    '@mastara/ui-tokens',
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
