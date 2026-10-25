// apps/mobile/src/modules/store/components/PaymentNotificationBanner.tsx
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createStyles, useTheme } from '@/core/theme';
import { AppText, IconTile, Icon } from '@/shared/ui';

export interface PaymentBannerProps {
  type: 'APPROVED' | 'REJECTED' | 'PENDING';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

export function PaymentNotificationBanner({
  type,
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: PaymentBannerProps) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const isApproved = type === 'APPROVED';
  const isRejected = type === 'REJECTED';
  const isPending = type === 'PENDING';

  const accentColor = isApproved
    ? theme.colors.primary
    : isRejected
      ? theme.colors.danger
      : theme.colors.text;

  const borderColor = isApproved
    ? theme.colors.primary
    : isRejected
      ? theme.colors.danger
      : theme.colors.border;

  const bgTint = isApproved
    ? theme.colors.primarySoft
    : isRejected
      ? theme.colors.dangerSoft
      : theme.colors.border;

  const iconName = isApproved ? 'check' : isRejected ? 'close' : 'clock';
  const iconColor = isApproved
    ? theme.colors.primary
    : isRejected
      ? theme.colors.danger
      : theme.colors.text;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 12),
          borderColor,
          backgroundColor: theme.scheme === 'dark' ? theme.colors.surface : bgTint,
        },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor: isApproved
                ? theme.colors.primarySoft
                : isRejected
                  ? theme.colors.dangerSoft
                  : theme.colors.surface,
            },
          ]}
        >
          <Icon name={iconName} size={20} color={iconColor} />
        </View>

        <View style={styles.textContainer}>
          <AppText bold style={styles.title} color={isPending ? theme.colors.text : undefined}>
            {title}
          </AppText>
          <AppText
            variant="caption"
            muted={!isPending}
            color={isPending ? theme.colors.text : undefined}
            style={styles.message}
          >
            {message}
          </AppText>

          {actionLabel && onAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={onAction}
              style={[styles.actionBtn, { borderColor: accentColor }]}
            >
              <AppText variant="caption" bold color={accentColor}>
                {actionLabel}
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          onPress={onDismiss}
          style={styles.dismissBtn}
        >
          <Icon name="close" size={16} color={theme.colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  container: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 9999,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    padding: theme.spacing.sm,
    shadowColor: theme.colors.overlay,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: theme.fontSize.body,
  },
  message: {
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  dismissBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
