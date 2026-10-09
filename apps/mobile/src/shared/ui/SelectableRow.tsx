// apps/mobile/src/shared/ui/SelectableRow.tsx
import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { theme } from '@/core/theme';

import { AppText } from './AppText';

interface SelectableRowProps {
  title: string;
  description?: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  /** Optional element on the right, for example a <Badge />. */
  trailing?: ReactNode;
}

export function SelectableRow({ title, description, selected, onToggle, disabled = false, trailing }: SelectableRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={[styles.row, selected && styles.rowSelected, disabled && styles.disabled]}
    >
      <View style={[styles.box, selected && styles.boxSelected]}>
        {selected ? (
          <AppText variant="caption" bold color={theme.colors.onPrimary}>
            ✓
          </AppText>
        ) : null}
      </View>
      <View style={styles.text}>
        <AppText bold>{title}</AppText>
        {description ? (
          <AppText variant="caption" muted>
            {description}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: theme.minTouchTarget + theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  rowSelected: { borderColor: theme.colors.primary },
  disabled: { opacity: 0.55 },
  box: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  text: { flex: 1, gap: 2 },
});
