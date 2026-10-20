// apps/admin-web/src/app/(portal)/content/tests/[quiz]/studio/page.tsx
import { quizNoFromSlug } from '@mastara/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { adminText } from '@/core/i18n';
import { ContentQuizStudioScreen } from '@/modules/tests';

export const metadata: Metadata = { title: adminText('admin.tests.list.title') };

export default async function Page({ params }: { params: Promise<{ quiz: string }> }) {
  const quizNo = quizNoFromSlug((await params).quiz);
  if (quizNo === null) notFound();
  return (
    <Suspense>
      <ContentQuizStudioScreen quizNo={quizNo} />
    </Suspense>
  );
}
