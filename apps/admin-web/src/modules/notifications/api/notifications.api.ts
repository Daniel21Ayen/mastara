// apps/admin-web/src/modules/notifications/api/notifications.api.ts
import { httpClient } from '@/core/network';

export type NotificationType = 'PAYMENT' | 'STUDENT' | 'EXAM' | 'SYSTEM' | 'SECURITY';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  linkHref?: string;
  actionLabel?: string;
}

export type BroadcastAudience = 'ALL' | 'NATURAL_SCIENCE' | 'SOCIAL_SCIENCE' | 'AASTU' | 'BDU' | 'JU' | 'MU';
export type BroadcastPriority = 'INFO' | 'EXAM' | 'URGENT' | 'MAINTENANCE';

export interface StudentBroadcast {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  priority: BroadcastPriority;
  actionUrl?: string;
  sentAt: string;
  sentBy: string;
  recipientCount: number;
}

export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  try {
    const list = await httpClient.get<AdminNotification[]>('/notifications/admin/notifications');
    return list ?? [];
  } catch {
    return [];
  }
}

export async function markAsRead(id: string): Promise<AdminNotification[]> {
  return httpClient.patch<AdminNotification[]>(
    `/notifications/admin/notifications/${encodeURIComponent(id)}/read`,
  );
}

export async function markAllAsRead(): Promise<AdminNotification[]> {
  return httpClient.post<AdminNotification[]>('/notifications/admin/notifications/read-all');
}

export async function removeNotification(id: string): Promise<AdminNotification[]> {
  return httpClient.delete<AdminNotification[]>(
    `/notifications/admin/notifications/${encodeURIComponent(id)}`,
  );
}

export async function fetchBroadcasts(): Promise<StudentBroadcast[]> {
  try {
    const list = await httpClient.get<StudentBroadcast[]>('/notifications/admin/broadcasts');
    return list ?? [];
  } catch {
    return [];
  }
}

export async function sendBroadcast(input: {
  title: string;
  body: string;
  audience: BroadcastAudience;
  priority: BroadcastPriority;
  actionUrl?: string;
}): Promise<StudentBroadcast> {
  return httpClient.post<StudentBroadcast>('/notifications/admin/broadcast', input);
}
