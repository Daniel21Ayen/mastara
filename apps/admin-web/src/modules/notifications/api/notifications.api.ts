// apps/admin-web/src/modules/notifications/api/notifications.api.ts
import {
  clearNotification,
  createStudentBroadcast,
  getNotifications,
  getStudentBroadcasts,
  markAllNotificationsRead,
  markNotificationRead,
  recordAudit,
  type AdminNotification,
  type BroadcastAudience,
  type BroadcastPriority,
  type StudentBroadcast,
} from '@/core/mock/data';
import { env } from '@/core/config/env';
import { httpClient } from '@/core/network';

export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  if (env.useMocks) return getNotifications();
  return httpClient.get<AdminNotification[]>('/notifications/admin/notifications');
}

export async function markAsRead(id: string): Promise<AdminNotification[]> {
  if (env.useMocks) return markNotificationRead(id);
  return httpClient.patch<AdminNotification[]>(`/notifications/admin/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllAsRead(): Promise<AdminNotification[]> {
  if (env.useMocks) return markAllNotificationsRead();
  return httpClient.post<AdminNotification[]>('/notifications/admin/notifications/read-all');
}

export async function removeNotification(id: string): Promise<AdminNotification[]> {
  if (env.useMocks) return clearNotification(id);
  return httpClient.delete<AdminNotification[]>(`/notifications/admin/notifications/${encodeURIComponent(id)}`);
}

export async function fetchBroadcasts(): Promise<StudentBroadcast[]> {
  if (env.useMocks) return getStudentBroadcasts();
  return httpClient.get<StudentBroadcast[]>('/notifications/admin/broadcasts');
}

export async function sendBroadcast(input: {
  title: string;
  body: string;
  audience: BroadcastAudience;
  priority: BroadcastPriority;
  actionUrl?: string;
}): Promise<StudentBroadcast> {
  if (env.useMocks) {
    const broadcast = createStudentBroadcast(input);

    // Audited sensitive action
    recordAudit({
      actor: 'ADMIN',
      action: 'ANNOUNCEMENT_SENT' as any,
      target: `Broadcast: "${broadcast.title}"`,
      reason: `Target: ${broadcast.audience} (${broadcast.recipientCount} students)`,
    });

    return broadcast;
  }

  return httpClient.post<StudentBroadcast>('/notifications/admin/broadcast', input);
}
