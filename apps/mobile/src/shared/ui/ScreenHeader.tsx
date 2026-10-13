// apps/mobile/src/shared/ui/ScreenHeader.tsx
import { View } from 'react-native';

import { createStyles } from '@/core/theme';

import { AppText } from './AppText';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? <AppText muted>{subtitle}</AppText> : null}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.xs, paddingTop: theme.spacing.lg },
}));
