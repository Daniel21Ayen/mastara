// apps/mobile/src/shared/ui/ChipGroup.tsx
import { Pressable, View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';

import { AppText } from './AppText';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  options: readonly ChipOption<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
}

/** Multi-select chips. */
export function ChipGroup<T extends string>({ options, selected, onToggle }: ChipGroupProps<T>) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            onPress={() => onToggle(option.value)}
            style={[styles.chip, active ? styles.active : styles.idle]}
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

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    minHeight: 40,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  active: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  idle: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
}));
