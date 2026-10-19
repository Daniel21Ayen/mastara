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

export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  return getNotifications();
}

export async function markAsRead(id: string): Promise<AdminNotification[]> {
  return markNotificationRead(id);
}

export async function markAllAsRead(): Promise<AdminNotification[]> {
  return markAllNotificationsRead();
}

export async function removeNotification(id: string): Promise<AdminNotification[]> {
  return clearNotification(id);
}

export async function fetchBroadcasts(): Promise<StudentBroadcast[]> {
  return getStudentBroadcasts();
}

export async function sendBroadcast(input: {
  title: string;
  body: string;
  audience: BroadcastAudience;
  priority: BroadcastPriority;
  actionUrl?: string;
}): Promise<StudentBroadcast> {
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
