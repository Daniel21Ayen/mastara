// apps/admin-web/src/modules/content/components/ContentShell.tsx
'use client';

import type { ReactNode } from 'react';

import { ContentCourseProvider } from '../state/ContentCourseContext';

/** Wraps every `/content/*` page so the chosen course survives moving between them. */
export function ContentShell({ children }: { children: ReactNode }) {
  return <ContentCourseProvider>{children}</ContentCourseProvider>;
}
