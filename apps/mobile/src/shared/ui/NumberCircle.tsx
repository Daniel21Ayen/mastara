// apps/mobile/src/shared/ui/NumberCircle.tsx
import { View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';
import type { AccentName } from '@/core/theme';

import { AppText } from './AppText';

interface NumberCircleProps {
  value: number | string;
  active?: boolean;
  accent?: AccentName;
}

/** Filled coloured circle with a white number for current step/question, or outline with ink number. */
export function NumberCircle({ value, active = true, accent = 'blue' }: NumberCircleProps) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View
      style={[
        styles.circle,
        active
          ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
          : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <AppText bold color={active ? theme.colors.onPrimary : theme.colors.text} variant="bodyLarge">
        {value}
      </AppText>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  circle: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
}));
