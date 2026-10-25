// apps/mobile/src/modules/notifications/components/NotificationRow.tsx
import type { AppNotification } from '@mastara/contracts';
import type { NotificationKind } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles } from '@/core/theme';
import type { AccentName } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppText, IconTile } from '@/shared/ui';
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
  ACCESS_EXPIRING: 'clock',
  EXAM_RESULT: 'exam',
};

const ACCENT: Record<NotificationKind, AccentName> = {
  WELCOME: 'blue',
  PAYMENT_PENDING: 'blue',
  PAYMENT_APPROVED: 'blue',
  PAYMENT_REJECTED: 'danger',
  ACCESS_EXPIRING: 'blue',
  EXAM_RESULT: 'blue',
};

export function NotificationRow({ item, onPress }: NotificationRowProps) {
  const styles = useStyles();
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
      <IconTile icon={ICON[item.kind]} accent={ACCENT[item.kind]} solid={false} />
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

const useStyles = createStyles((theme) => ({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  unread: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  text: { flex: 1, gap: 2 },
  dot: { width: 10, height: 10, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
}));
