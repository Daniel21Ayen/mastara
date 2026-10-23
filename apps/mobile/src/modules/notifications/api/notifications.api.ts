// apps/mobile/src/modules/notifications/api/notifications.api.ts
import type { AppNotification } from '@mastara/contracts';
import { RENEWAL_WINDOW_DAYS } from '@mastara/domain';

import { env } from '@/core/config/env';
import { cacheReads } from '@/core/db';
import {
  accessFor,
  courses,
  isNotificationRead,
  listOrders,
  markNotificationsRead,
} from '@/core/mock/data';
import { simulateLatency } from '@/core/mock/delay';
import { httpClient } from '@/core/network';

export interface NotificationsApi {
  /** Newest first. */
  getNotifications(userId: string, courseIds: readonly string[]): Promise<AppNotification[]>;
  markRead(ids: readonly string[]): Promise<void>;
}

const WELCOME_TIME = '2026-01-01T00:00:00.000Z';

function build(userId: string, courseIds: readonly string[]): AppNotification[] {
  const items: Omit<AppNotification, 'read'>[] = [
    { id: 'welcome', kind: 'WELCOME', params: {}, createdAt: WELCOME_TIME },
  ];

  for (const order of listOrders(userId)) {
    if (order.status === 'PENDING') {
      items.push({ id: `order-${order.id}-pending`, kind: 'PAYMENT_PENDING', params: { amount: order.amount }, createdAt: order.createdAt });
    } else if (order.status === 'APPROVED') {
      items.push({ id: `order-${order.id}-approved`, kind: 'PAYMENT_APPROVED', params: { days: order.durationDays }, createdAt: order.createdAt });
    } else {
      items.push({ id: `order-${order.id}-rejected`, kind: 'PAYMENT_REJECTED', params: { reason: order.rejectReason ?? 'MISMATCH' }, createdAt: order.createdAt });
    }
  }

  for (const id of courseIds) {
    const { access, daysLeft } = accessFor(id);
    const course = courses.find((item) => item.id === id);
    if (course && access === 'PAID' && daysLeft !== undefined && daysLeft <= RENEWAL_WINDOW_DAYS) {
      items.push({ id: `expiring-${id}`, kind: 'ACCESS_EXPIRING', params: { course: course.title, days: daysLeft }, createdAt: new Date().toISOString() });
    }
  }

  return items
    .map((item) => ({ ...item, read: isNotificationRead(item.id) }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

const mockNotificationsApi: NotificationsApi = {
  async getNotifications(userId, courseIds) {
    await simulateLatency(100);
    return build(userId, courseIds);
  },
  async markRead(ids) {
    markNotificationsRead(ids);
  },
};

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

const baseApi: NotificationsApi = env.useMocks ? mockNotificationsApi : realNotificationsApi;

/** Reads are saved on the phone and used when it is offline; writes always need the server. */
export const notificationsApi = cacheReads('notifications', baseApi, ['getNotifications']);
