// apps/admin-web/src/app/(auth)/login/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { safeNextPath } from '@/core/session/cookie';
import { LoginScreen } from '@/modules/auth';

export const metadata: Metadata = { title: adminText('admin.login.submit') };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <LoginScreen nextPath={safeNextPath(Array.isArray(next) ? next[0] : next)} />;
}
