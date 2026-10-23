// apps/admin-web/src/modules/notifications/api/notifications.api.ts
import {
  clearNotification,
  createStudentBroadcast,
  getNotifications,
  getStudentBroadcasts,
  markAllNotificationsRead,
  markNotificationRead,
  recordAudit,
} from '@/core/mock/data';
import type {
  AdminNotification,
  NotificationType,
  BroadcastAudience,
  BroadcastPriority,
  StudentBroadcast,
} from '@/core/mock/data';
import { env } from '@/core/config/env';
import { httpClient } from '@/core/network';

export type {
  AdminNotification,
  NotificationType,
  BroadcastAudience,
  BroadcastPriority,
  StudentBroadcast,
};

export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  if (env.useMocks) return getNotifications();
  try {
    const list = await httpClient.get<AdminNotification[]>('/notifications/admin/notifications');
    return list ?? [];
  } catch {
    return getNotifications();
  }
}

export async function markAsRead(id: string): Promise<AdminNotification[]> {
  if (env.useMocks) return markNotificationRead(id);
  try {
    return await httpClient.patch<AdminNotification[]>(
      `/notifications/admin/notifications/${encodeURIComponent(id)}/read`,
    );
  } catch {
    return markNotificationRead(id);
  }
}

export async function markAllAsRead(): Promise<AdminNotification[]> {
  if (env.useMocks) return markAllNotificationsRead();
  try {
    return await httpClient.post<AdminNotification[]>('/notifications/admin/notifications/read-all');
  } catch {
    return markAllNotificationsRead();
  }
}

export async function removeNotification(id: string): Promise<AdminNotification[]> {
  if (env.useMocks) return clearNotification(id);
  try {
    return await httpClient.delete<AdminNotification[]>(
      `/notifications/admin/notifications/${encodeURIComponent(id)}`,
    );
  } catch {
    return clearNotification(id);
  }
}

export async function fetchBroadcasts(): Promise<StudentBroadcast[]> {
  if (env.useMocks) return getStudentBroadcasts();
  try {
    const list = await httpClient.get<StudentBroadcast[]>('/notifications/admin/broadcasts');
    return list ?? [];
  } catch {
    return getStudentBroadcasts();
  }
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
    recordAudit({
      actor: 'ADMIN',
      action: 'ANNOUNCEMENT_SENT' as any,
      target: `Broadcast: "${broadcast.title}"`,
      reason: `Target: ${broadcast.audience} (${broadcast.recipientCount} students)`,
    });
    return broadcast;
  }

  try {
    return await httpClient.post<StudentBroadcast>('/notifications/admin/broadcast', input);
  } catch {
    return createStudentBroadcast(input);
  }
}
