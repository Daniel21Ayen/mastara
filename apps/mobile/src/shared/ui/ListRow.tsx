// apps/mobile/src/shared/ui/ListRow.tsx
import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { theme } from '@/core/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon: IconName;
  onPress?: () => void;
  /** Replaces the chevron, for example a <Badge />. */
  trailing?: ReactNode;
}

/** Card row: icon tile, two text lines and a chevron. */
export function ListRow({ title, subtitle, icon, onPress, trailing }: ListRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.tile}>
        <Icon name={icon} color={theme.colors.primary} />
      </View>
      <View style={styles.text}>
        <AppText bold>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ?? <Icon name="chevron" color={theme.colors.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
