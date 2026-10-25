// apps/admin-web/src/core/permissions/usePermissions.ts
'use client';

import { useAdminSession } from '@/core/session';
import { hasPermission, ROLE_PERMISSIONS, type AdminRole } from '@mastara/domain';

export function usePermissions() {
  const { user } = useAdminSession();
  const adminRole = (user.adminRole || 'SUPER_ADMIN') as AdminRole;
  const permissions = user.permissions || ROLE_PERMISSIONS[adminRole] || [];

  const can = (permission: string): boolean => {
    if (adminRole === 'SUPER_ADMIN') return true;
    if (permissions.includes('*')) return true;
    return hasPermission(adminRole, permission) || permissions.includes(permission);
  };

  return {
    adminRole,
    permissions,
    can,
    isSuperAdmin: adminRole === 'SUPER_ADMIN',
    isAcademicAdmin: adminRole === 'ACADEMIC_ADMIN',
    isOperationsAdmin: adminRole === 'OPERATIONS_ADMIN',
  };
}
