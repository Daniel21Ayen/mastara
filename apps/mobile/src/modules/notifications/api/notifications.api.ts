// apps/mobile/src/modules/notifications/api/notifications.api.ts
import type { AppNotification } from '@mastara/contracts';
import type { NotificationKind } from '@mastara/domain';

import { cacheReads } from '@/core/db';
import { httpClient } from '@/core/network';

export interface NotificationsApi {
  /** Newest first. */
  getNotifications(userId: string, courseIds: readonly string[]): Promise<AppNotification[]>;
  markRead(ids: readonly string[]): Promise<void>;
}

const kindMap: Record<string, NotificationKind> = {
  WELCOME: 'WELCOME',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  ENTITLEMENT_EXPIRING: 'ACCESS_EXPIRING',
  ACCESS_EXPIRING: 'ACCESS_EXPIRING',
};

const realNotificationsApi: NotificationsApi = {
  async getNotifications(_userId, _courseIds) {
    const list = await httpClient.get<any[]>('/notifications');
    return list.map((n) => {
      const kind: NotificationKind = kindMap[n.type] ?? 'WELCOME';
      return {
        id: n.id,
        kind,
        params: (n.data as Record<string, string | number>) || {},
        createdAt:
          typeof n.createdAt === 'string'
            ? n.createdAt
            : new Date(n.createdAt ?? Date.now()).toISOString(),
        read: Boolean(n.isRead),
      };
    });
  },
  async markRead(ids) {
    await Promise.all(ids.map((id) => httpClient.patch<any>(`/notifications/${id}/read`)));
  },
};

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const notificationsApi = cacheReads('notifications', realNotificationsApi, ['getNotifications']);
