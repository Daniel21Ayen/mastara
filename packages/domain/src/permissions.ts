// packages/domain/src/permissions.ts
// Requirements: SRS v3.2 D3, D20, 4.4, 4.5 Permission Matrix

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ACADEMIC_ADMIN', 'OPERATIONS_ADMIN'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ALL_ADMIN_PERMISSIONS = [
  '*',
  // Catalog
  'catalog.read',
  'catalog.write',
  'course.edit',
  // Content & Academic
  'content.write',
  'content.submit',
  'content.publish',
  'questions.write',
  'scans.write',
  'chapterFree.set',
  'announce.course',
  'reports.academic',
  // Operations & Finance
  'students.read',
  'students.support',
  'payments.review',
  'refunds.request',
  'refunds.approve',
  'devices.release',
  'entitlements.grantLimited',
  'support.reply',
  'announce.ops',
  'reports.ops',
  'pricing.read',
  'pricing.write',
  // Super Admin Platform
  'audit.read',
  'admins.manage',
  'system.config',
] as const;

export type AdminPermission = (typeof ALL_ADMIN_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly string[]> = {
  SUPER_ADMIN: ['*'],
  ACADEMIC_ADMIN: [
    'catalog.read',
    'course.edit',
    'content.write',
    'content.submit',
    'questions.write',
    'scans.write',
    'chapterFree.set',
    'announce.course',
    'reports.academic',
  ],
  OPERATIONS_ADMIN: [
    'catalog.read',
    'students.read',
    'students.support',
    'payments.review',
    'refunds.request',
    'devices.release',
    'entitlements.grantLimited',
    'support.reply',
    'announce.ops',
    'reports.ops',
    'pricing.read',
  ],
} as const;

/**
 * Checks whether an admin role has a specific permission.
 * Super Admin ('*') has all permissions.
 */
export function hasPermission(
  adminRole: AdminRole | string | null | undefined,
  permission: string,
): boolean {
  if (!adminRole) return false;
  const role = adminRole as AdminRole;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

/**
 * Returns the effective permission list for an admin role.
 */
export function getPermissionsForRole(adminRole: AdminRole | string): readonly string[] {
  return ROLE_PERMISSIONS[adminRole as AdminRole] ?? [];
}
