// apps/mobile/src/shared/ui/UnderlineTabs.tsx
import { Pressable, View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';

import { AppText } from './AppText';

export interface UnderlineTabOption<T extends string> {
  value: T;
  label: string;
}

interface UnderlineTabsProps<T extends string> {
  options: readonly UnderlineTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Lower tabs: text with a primary underline under the active one. */
export function UnderlineTabs<T extends string>({ options, value, onChange }: UnderlineTabsProps<T>) {
  const theme = useTheme();
  const styles = useStyles();
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
            style={[styles.tab, active && styles.active]}
          >
            <AppText bold color={active ? theme.colors.primary : theme.colors.textMuted}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: {
    flex: 1,
    minHeight: theme.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  active: { borderBottomColor: theme.colors.primary },
}));
