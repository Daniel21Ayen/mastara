// apps/admin-web/src/app/(portal)/support/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { SupportScreen } from '@/modules/support';

export const metadata: Metadata = {
  title: `${adminText('admin.support.title')} · Mastara Admin`,
};

export default function Page() {
  return <SupportScreen />;
}
