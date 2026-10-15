// apps/admin-web/next.config.ts
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The shared packages export TypeScript source, so Next must compile them.
  transpilePackages: [
    '@mastara/contracts',
    '@mastara/domain',
    '@mastara/i18n',
    '@mastara/ui-tokens',
  ],
};

export default config;
