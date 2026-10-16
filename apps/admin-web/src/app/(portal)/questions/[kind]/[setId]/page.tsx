// apps/admin-web/src/app/(portal)/questions/[kind]/[setId]/page.tsx
import { examSetKindFromSlug } from '@mastara/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { adminText } from '@/core/i18n';
import { QuestionFormScreen } from '@/modules/questions';

export const metadata: Metadata = { title: adminText('admin.questions.form.heading') };

export default async function Page({
  params,
}: {
  params: Promise<{ kind: string; setId: string }>;
}) {
  const { kind: slug, setId } = await params;
  const kind = examSetKindFromSlug(slug);
  if (kind === null) notFound();
  return <QuestionFormScreen kind={kind} setId={decodeURIComponent(setId)} />;
}
