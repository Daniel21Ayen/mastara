// apps/admin-web/src/app/(portal)/students/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { adminText } from '@/core/i18n';
import { StudentsScreen } from '@/modules/students';

export const metadata: Metadata = { title: adminText('admin.students.title') };

export default function StudentsPage() {
  // The screen reads the `q` search text from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <StudentsScreen />
    </Suspense>
  );
}
