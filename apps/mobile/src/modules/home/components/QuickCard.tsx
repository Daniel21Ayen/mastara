// apps/mobile/src/modules/home/components/QuickCard.tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/core/theme';
import { AppText, Icon } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

interface QuickCardProps {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  /** Small red dot, for example when a payment needs attention. */
  alert?: boolean;
}

export function QuickCard({ icon, title, subtitle, onPress, alert = false }: QuickCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <Icon name={icon} color={theme.colors.primary} />
        {alert ? <View style={styles.dot} /> : null}
      </View>
      <AppText bold variant="caption">
        {title}
      </AppText>
      <AppText variant="caption" muted>
        {subtitle}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  pressed: { opacity: 0.85 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
  },
});
