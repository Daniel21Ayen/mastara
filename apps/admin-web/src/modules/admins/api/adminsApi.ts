// apps/admin-web/src/modules/admins/api/adminsApi.ts
import { httpClient } from '@/core/network';
import type {
  AdminUserRecord,
  CreateAdminPayload,
  TotpSetupResponse,
  UpdateAdminPayload,
} from '../types';

export async function fetchAdmins(): Promise<AdminUserRecord[]> {
  const data = await httpClient.get<AdminUserRecord[]>('/admins');
  return data ?? [];
}

export async function fetchAdminById(id: string): Promise<AdminUserRecord> {
  return httpClient.get<AdminUserRecord>(`/admins/${id}`);
}

export async function createAdmin(payload: CreateAdminPayload): Promise<AdminUserRecord> {
  return httpClient.post<AdminUserRecord>('/admins', payload);
}

export async function updateAdmin(
  id: string,
  payload: UpdateAdminPayload,
): Promise<AdminUserRecord> {
  return httpClient.put<AdminUserRecord>(`/admins/${id}`, payload);
}

export async function deleteAdmin(id: string): Promise<{ success: boolean }> {
  return httpClient.delete<{ success: boolean }>(`/admins/${id}`);
}

export async function setupAdminTotp(id: string): Promise<TotpSetupResponse> {
  return httpClient.post<TotpSetupResponse>(`/admins/${id}/totp/setup`, {});
}

export async function verifyAdminTotp(
  id: string,
  token: string,
): Promise<{ success: boolean }> {
  return httpClient.post<{ success: boolean }>(`/admins/${id}/totp/verify`, { token });
}
