// apps/admin-web/src/modules/admins/types.ts

export type AdminRoleType = 'SUPER_ADMIN' | 'ACADEMIC_ADMIN' | 'OPERATIONS_ADMIN';

export interface AdminUserRecord {
  id: string;
  email: string;
  admin_role: AdminRoleType;
  full_name: string | null;
  phone_number: string | null;
  is_active: boolean;
  totp_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  scopes?: Array<{
    id: string;
    university_id?: string | null;
    program_id?: string | null;
    course_id?: string | null;
  }>;
}

export interface CreateAdminPayload {
  email: string;
  password: string;
  admin_role: AdminRoleType;
  full_name?: string;
  phone_number?: string;
  is_active?: boolean;
}

export interface UpdateAdminPayload {
  email?: string;
  admin_role?: AdminRoleType;
  full_name?: string;
  phone_number?: string;
  is_active?: boolean;
  password?: string;
}

export interface TotpSetupResponse {
  secret: string;
  otpAuthUrl: string;
}
