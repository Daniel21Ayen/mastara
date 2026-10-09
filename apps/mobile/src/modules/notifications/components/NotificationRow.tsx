// apps/mobile/src/modules/notifications/components/NotificationRow.tsx
import type { AppNotification } from '@mastara/contracts';
import type { NotificationKind } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppText, Icon } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

interface NotificationRowProps {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}

const ICON: Record<NotificationKind, IconName> = {
  WELCOME: 'bell',
  PAYMENT_PENDING: 'store',
  PAYMENT_APPROVED: 'check',
  PAYMENT_REJECTED: 'close',
  ACCESS_EXPIRING: 'lock',
};

export function NotificationRow({ item, onPress }: NotificationRowProps) {
  const { t } = useI18n();
  const timeAgo = useTimeAgo();

  // A rejected payment carries a reason code; show it in the student's language.
  const params =
    item.kind === 'PAYMENT_REJECTED'
      ? { ...item.params, reason: t(`orders.reason.${item.params.reason}` as TranslationKey) }
      : item.params;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !item.read }}
      onPress={() => onPress(item)}
      style={[styles.row, !item.read && styles.unread]}
    >
      <View style={styles.tile}>
        <Icon name={ICON[item.kind]} color={theme.colors.primary} />
      </View>
      <View style={styles.text}>
        <AppText bold>{t(`notif.${item.kind}.title`)}</AppText>
        <AppText variant="caption" muted>
          {t(`notif.${item.kind}.body`, params)}
        </AppText>
        <AppText variant="caption" muted>
          {item.kind === 'WELCOME' ? '' : timeAgo(item.createdAt)}
        </AppText>
      </View>
      {!item.read ? <View style={styles.dot} accessibilityLabel={t('notifications.unread')} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  unread: { borderColor: theme.colors.primarySoft },
  tile: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  dot: { width: 10, height: 10, borderRadius: theme.radius.pill, backgroundColor: theme.colors.danger },
});
