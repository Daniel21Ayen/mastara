// apps/admin-web/src/app/(portal)/students/[id]/page.tsx
import type { Metadata } from 'next';

import { adminText } from '@/core/i18n';
import { StudentProfileScreen } from '@/modules/students';

export const metadata: Metadata = { title: adminText('admin.nav.students') };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentProfileScreen key={id} id={decodeURIComponent(id)} />;
}
