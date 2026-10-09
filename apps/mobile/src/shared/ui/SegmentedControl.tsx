// apps/mobile/src/shared/ui/SegmentedControl.tsx
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/core/theme';

import { AppText } from './AppText';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active ? styles.active : styles.idle]}
          >
            <AppText bold color={active ? theme.colors.onPrimary : theme.colors.text}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  segment: {
    flex: 1,
    minHeight: theme.minTouchTarget,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: theme.colors.primary },
  idle: { backgroundColor: theme.colors.surface },
});
