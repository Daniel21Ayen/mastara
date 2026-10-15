// apps/admin-web/src/app/(portal)/content/modules/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { adminText } from '@/core/i18n';
import { ModulesScreen } from '@/modules/content';

export const metadata: Metadata = { title: adminText('admin.nav.modules') };

export default function Page() {
  // The screen reads the top-bar search text from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <ModulesScreen />
    </Suspense>
  );
}
