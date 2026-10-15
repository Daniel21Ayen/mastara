// apps/admin-web/src/app/(portal)/content/amharic-notes/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { adminText } from '@/core/i18n';
import { AmharicNotesScreen } from '@/modules/content';

export const metadata: Metadata = { title: adminText('admin.nav.amharicNotes') };

export default function Page() {
  // The screen reads the top-bar search text from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <AmharicNotesScreen />
    </Suspense>
  );
}
