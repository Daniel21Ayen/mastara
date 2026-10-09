// apps/mobile/src/modules/notifications/hooks/useNotifications.ts
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useSession } from '@/core/session';
import { useAsync } from '@/shared/hooks';

import { notificationsApi } from '../api/notifications.api';

function useNotificationsData() {
  const { user, profile } = useSession();
  const courseIds = profile?.courseIds ?? [];
  const state = useAsync(user ? () => notificationsApi.getNotifications(user.id, courseIds) : null, [user, courseIds.join(',')]);

  const { reload } = state;
  useFocusEffect(useCallback(() => reload(), [reload]));

  return state;
}

export function useNotifications() {
  const state = useNotificationsData();

  async function markAllRead() {
    const unread = (state.data ?? []).filter((item) => !item.read).map((item) => item.id);
    if (unread.length === 0) return;
    await notificationsApi.markRead(unread);
    state.reload();
  }

  async function markRead(id: string) {
    await notificationsApi.markRead([id]);
    state.reload();
  }

  return { items: state.data ?? [], loading: state.loading, error: state.error, reload: state.reload, markAllRead, markRead };
}

/** Number of unread notifications, for the bell on Home and the Profile row. */
export function useUnreadCount(): number {
  const state = useNotificationsData();
  return (state.data ?? []).filter((item) => !item.read).length;
}
