// apps/mobile/src/shared/ui/NumberCircle.tsx
import { View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';
import type { AccentName } from '@/core/theme';

import { AppText } from './AppText';

/** Filled coloured circle with a white number, for chapters and steps. */
export function NumberCircle({ value, accent = 'blue' }: { value: number; accent?: AccentName }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.circle, { backgroundColor: theme.accents[accent].main }]}>
      <AppText bold color={theme.colors.onPrimary} variant="bodyLarge">
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
  },
}));
