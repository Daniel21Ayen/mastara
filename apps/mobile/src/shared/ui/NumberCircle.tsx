// apps/mobile/src/shared/ui/NumberCircle.tsx
import { StyleSheet, View } from 'react-native';

import { theme } from '@/core/theme';

import { AppText } from './AppText';

/** Filled primary circle with a white number, for chapters and steps. */
export function NumberCircle({ value }: { value: number }) {
  return (
    <View style={styles.circle}>
      <AppText bold color={theme.colors.onPrimary} variant="bodyLarge">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
