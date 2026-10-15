// apps/admin-web/src/app/(portal)/content/tests/[quiz]/new/page.tsx
import { quizNoFromSlug } from '@mastara/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { adminText } from '@/core/i18n';
import { QuestionEditorScreen } from '@/modules/tests';

export const metadata: Metadata = { title: adminText('admin.tests.editor.titleNew') };

export default async function Page({ params }: { params: Promise<{ quiz: string }> }) {
  const quizNo = quizNoFromSlug((await params).quiz);
  if (quizNo === null) notFound();
  return <QuestionEditorScreen quizNo={quizNo} />;
}
