// apps/admin-web/src/app/(portal)/content/layout.tsx
import type { ReactNode } from 'react';

import { ContentShell } from '@/modules/content';

/** One shared course choice for every Content page. */
export default function ContentLayout({ children }: { children: ReactNode }) {
  return <ContentShell>{children}</ContentShell>;
}
