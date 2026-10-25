// apps/admin-web/src/core/mock/data/adminAccounts.ts
import type { AdminUser } from '@mastara/contracts';

export interface MockAdminAccount {
  user: AdminUser;
  password: string;
}

/** The only mock account. Real admin accounts are created on the server in backend phase B2. */
export const MOCK_ADMIN_ACCOUNTS: readonly MockAdminAccount[] = [
  {
    user: { id: 'admin-1', name: 'Admin', identifier: 'admin@mastara.demo', role: 'ADMIN' },
    password: 'admin123',
  },
];
