// apps/mobile/src/modules/notifications/screens/NotificationsScreen.tsx
import type { AppNotification } from '@mastara/contracts';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppButton, AppText, Screen, TopBar } from '@/shared/ui';

import { NotificationRow } from '../components/NotificationRow';
import { useNotifications } from '../hooks/useNotifications';

const DESTINATION: Partial<Record<AppNotification['kind'], Href>> = {
  PAYMENT_PENDING: '/store/orders' as Href,
  PAYMENT_APPROVED: '/store/orders' as Href,
  PAYMENT_REJECTED: '/store/orders' as Href,
  ACCESS_EXPIRING: '/store' as Href,
};

export function NotificationsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { items, loading, error, reload, markAllRead, markRead } = useNotifications();
  const hasUnread = items.some((item) => !item.read);

  function open(item: AppNotification) {
    void markRead(item.id);
    const destination = DESTINATION[item.kind];
    if (destination) router.push(destination);
  }

  return (
    <Screen scroll>
      <TopBar title={t('notifications.title')} onBack={() => router.back()} />

      {hasUnread ? <AppButton label={t('notifications.markAll')} variant="outline" onPress={() => void markAllRead()} /> : null}
      {loading && items.length === 0 ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && items.length === 0 ? <AppText muted>{t('notifications.empty')}</AppText> : null}

      <View style={styles.list}>
        {items.map((item) => (
          <NotificationRow key={item.id} item={item} onPress={open} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing.sm },
});
