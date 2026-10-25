// apps/admin-web/src/core/permissions/Can.tsx
'use client';

import type { ReactNode } from 'react';
import { usePermissions } from './usePermissions';

export interface CanProps {
  I: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children only if the authenticated administrator has the requested permission.
 * Super Admin ('*') always renders the children.
 */
export function Can({ I, children, fallback = null }: CanProps) {
  const { can } = usePermissions();
  if (can(I)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
