// apps/mobile/src/modules/notifications/api/notifications.api.ts
import type { AppNotification } from '@mastara/contracts';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface NotificationsApi {
  /** Newest first. */
  getNotifications(userId: string, courseIds: readonly string[]): Promise<AppNotification[]>;
  markRead(ids: readonly string[]): Promise<void>;
}

interface BackendNotificationResponse {
  id: string;
  type: string;
  titleEn: string;
  titleAm: string;
  messageEn: string;
  messageAm: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string | Date;
}

export const realNotificationsApi: NotificationsApi = {
  async getNotifications(_userId, _courseIds) {
    const list = await httpClient.get<BackendNotificationResponse[]>('/notifications');
    return (list ?? []).map((n) => ({
      id: n.id,
      kind: (n.type as unknown as AppNotification['kind']) ?? 'WELCOME',
      params: (n.data as Record<string, string | number>) ?? {},
      createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date(n.createdAt).toISOString(),
      read: n.isRead,
    }));
  },
  async markRead(ids) {
    await Promise.all(ids.map((id) => httpClient.patch(`/notifications/${id}/read`)));
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const notificationsApi = cacheReads('notifications', realNotificationsApi, ['getNotifications']);
