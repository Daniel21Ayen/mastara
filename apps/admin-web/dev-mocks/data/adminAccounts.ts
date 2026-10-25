// apps/admin-web/dev-mocks/data/adminAccounts.ts
import type { AdminUser } from '@mastara/contracts';
import { ROLE_PERMISSIONS } from '@mastara/domain';

export interface MockAdminAccount {
  user: AdminUser;
  password: string;
}

/** Demo admin accounts matching the three SRS v3.2 D20 roles. */
export const MOCK_ADMIN_ACCOUNTS: readonly MockAdminAccount[] = [
  {
    user: {
      id: 'admin-super-1',
      name: 'Super Admin',
      identifier: 'admin@mastara.demo',
      role: 'ADMIN',
      adminRole: 'SUPER_ADMIN',
      permissions: [...ROLE_PERMISSIONS.SUPER_ADMIN],
      scopes: [],
    },
    password: 'admin123',
  },
  {
    user: {
      id: 'admin-academic-1',
      name: 'Academic Coordinator',
      identifier: 'academic@mastara.demo',
      role: 'ADMIN',
      adminRole: 'ACADEMIC_ADMIN',
      permissions: [...ROLE_PERMISSIONS.ACADEMIC_ADMIN],
      scopes: [],
    },
    password: 'admin123',
  },
];
