// apps/admin-web/src/app/(portal)/layout.tsx
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { readSession } from '@/core/session/readSession';
import { PortalShell } from '@/modules/shell';

/** Every portal page sits inside the sidebar shell. Signed-out visitors are sent to the login page. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');
  return <PortalShell user={session.user}>{children}</PortalShell>;
}
