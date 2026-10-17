// apps/admin-web/src/app/(portal)/content/modules/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { adminText } from '@/core/i18n';
import { ContentMaterialStudioScreen } from '@/modules/content';

export const metadata: Metadata = { title: adminText('admin.nav.modules') };

export default function Page() {
  return (
    <Suspense>
      <ContentMaterialStudioScreen initialTab="modules" />
    </Suspense>
  );
}
