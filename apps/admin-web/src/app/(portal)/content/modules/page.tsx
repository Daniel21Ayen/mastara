// apps/admin-web/src/app/(portal)/content/modules/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { adminText } from '@/core/i18n';
import { ContentManagementScreen } from '@/modules/content';

export const metadata: Metadata = { title: adminText('admin.nav.modules') };

export default function Page() {
  return (
    <Suspense>
      <ContentManagementScreen initialTab="materials" initialMaterialSubTab="modules" />
    </Suspense>
  );
}
