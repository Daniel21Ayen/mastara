// apps/admin-web/src/app/(portal)/questions/[kind]/page.tsx
import { examSetKindFromSlug } from '@mastara/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { adminText } from '@/core/i18n';
import { ExamSetsListScreen } from '@/modules/questions';

export const metadata: Metadata = { title: adminText('admin.questions.list.title') };

export default async function Page({ params }: { params: Promise<{ kind: string }> }) {
  const kind = examSetKindFromSlug((await params).kind);
  if (kind === null) notFound();
  // The screen reads the top-bar search text from the address, which needs a Suspense boundary.
  return (
    <Suspense>
      <ExamSetsListScreen kind={kind} />
    </Suspense>
  );
}
