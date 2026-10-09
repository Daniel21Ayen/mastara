// apps/mobile/src/modules/store/components/ProductCard.tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText, Icon } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

interface ProductCardProps {
  icon: IconName;
  title: string;
  subtitle: string;
  /** Price in ETB. */
  price: number;
  disabled?: boolean;
  onPress: () => void;
}

export function ProductCard({ icon, title, subtitle, price, disabled = false, onPress }: ProductCardProps) {
  const { t } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <Icon name={icon} color={theme.colors.primary} />
      </View>
      <View style={styles.text}>
        <AppText bold>{title}</AppText>
        <AppText variant="caption" muted>
          {subtitle}
        </AppText>
      </View>
      <AppText bold color={theme.colors.primary}>
        {t('store.etb', { amount: price })}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  tile: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
