// apps/admin-web/src/app/(portal)/content/tests/[quiz]/page.tsx
import { quizNoFromSlug } from '@mastara/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { adminText } from '@/core/i18n';
import { ContentManagementScreen } from '@/modules/content';

export const metadata: Metadata = { title: adminText('admin.tests.list.title') };

export default async function Page({ params }: { params: Promise<{ quiz: string }> }) {
  const quizNo = quizNoFromSlug((await params).quiz);
  if (quizNo === null) notFound();
  return (
    <Suspense>
      <ContentManagementScreen initialTab="tests" initialQuiz={quizNo} />
    </Suspense>
  );
}
