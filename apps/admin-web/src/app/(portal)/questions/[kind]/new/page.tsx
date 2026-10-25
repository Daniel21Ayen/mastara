// apps/admin-web/src/app/(portal)/questions/[kind]/new/page.tsx
import { examSetKindFromSlug } from '@mastara/domain';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import { adminText } from '@/core/i18n';
import { StateMessage } from '@/shared/ui';

export const metadata: Metadata = { title: adminText('admin.questions.form.heading') };

const QuestionFormScreen = dynamic(
  () =>
    import('@/modules/questions/screens/QuestionFormScreen').then(
      (m) => m.QuestionFormScreen,
    ),
  {
    loading: () => <StateMessage>{adminText('admin.common.loading')}</StateMessage>,
  },
);

export default async function Page({ params }: { params: Promise<{ kind: string }> }) {
  const kind = examSetKindFromSlug((await params).kind);
  if (kind === null) notFound();
  return <QuestionFormScreen kind={kind} />;
}
