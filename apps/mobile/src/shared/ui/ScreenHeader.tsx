// apps/mobile/src/shared/ui/ScreenHeader.tsx
import { StyleSheet, View } from 'react-native';

import { theme } from '@/core/theme';

import { AppText } from './AppText';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? <AppText muted>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.xs, paddingTop: theme.spacing.lg },
});
