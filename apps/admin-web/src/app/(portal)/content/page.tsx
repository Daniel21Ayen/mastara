// apps/admin-web/src/app/(portal)/content/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { ContentManagementScreen } from '@/modules/content';

export const metadata: Metadata = { title: adminText('admin.content.title') };

export default function Page() {
  return <ContentManagementScreen initialTab="materials" />;
}
