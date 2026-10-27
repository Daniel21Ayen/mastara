// apps/mobile/src/modules/store/components/ProductCard.tsx
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import type { AccentName } from '@/core/theme';
import { AppText, IconTile } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

interface ProductCardProps {
  icon: IconName;
  accent?: AccentName;
  title: string;
  subtitle: string;
  /** Price in ETB. */
  price: number;
  disabled?: boolean;
  locked?: boolean;
  lockedMessage?: string;
  onPress: () => void;
}

export function ProductCard({
  icon,
  accent = 'blue',
  title,
  subtitle,
  price,
  disabled = false,
  locked = false,
  lockedMessage,
  onPress,
}: ProductCardProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();

  const isActuallyDisabled = disabled || locked;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isActuallyDisabled }}
      disabled={isActuallyDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isActuallyDisabled && styles.disabled,
        locked && styles.lockedCard,
        pressed && styles.pressed,
      ]}
    >
      <IconTile icon={icon} accent={locked ? 'gray' : 'blue'} solid size={48} />
      <View style={styles.text}>
        <AppText bold>{title}</AppText>
        <AppText variant="caption" muted>
          {subtitle}
        </AppText>
        {locked ? (
          <View style={styles.lockedBanner}>
            <AppText variant="caption" bold color={theme.colors.danger}>
              🔒 {lockedMessage || t('store.singleLocked')}
            </AppText>
          </View>
        ) : null}
      </View>
      {!locked ? (
        <View style={styles.actionColumn}>
          <AppText bold color={theme.colors.primary}>
            {t('store.etb', { amount: price })}
          </AppText>
          <View style={styles.purchaseBtn}>
            <AppText variant="caption" bold color={theme.colors.onPrimary}>
              {t('locked.buy')}
            </AppText>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = createStyles((theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 2 },
  actionColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  purchaseBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  lockedCard: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  lockedBanner: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.dangerSoft,
    alignSelf: 'flex-start',
  },
}));
