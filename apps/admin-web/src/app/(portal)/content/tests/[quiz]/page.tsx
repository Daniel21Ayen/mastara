// apps/admin-web/src/app/(portal)/content/tests/[quiz]/page.tsx
import { quizNoFromSlug } from '@mastara/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { adminText } from '@/core/i18n';
import { TestListScreen } from '@/modules/tests';

export const metadata: Metadata = { title: adminText('admin.tests.list.title') };

export default async function Page({ params }: { params: Promise<{ quiz: string }> }) {
  const quizNo = quizNoFromSlug((await params).quiz);
  if (quizNo === null) notFound();
  // The screen reads the top-bar search text from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <TestListScreen quizNo={quizNo} />
    </Suspense>
  );
}
