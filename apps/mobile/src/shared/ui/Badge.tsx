// apps/mobile/src/shared/ui/Badge.tsx
import { View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';

import { AppText } from './AppText';

interface BadgeProps {
  label: string;
  tone?: 'primary' | 'danger' | 'muted';
}

export function Badge({ label, tone = 'primary' }: BadgeProps) {
  const theme = useTheme();
  const styles = useStyles();

  const tones = {
    primary: { background: theme.colors.primarySoft, text: theme.colors.primary },
    danger: { background: theme.colors.dangerSoft, text: theme.colors.danger },
    muted: { background: theme.colors.border, text: theme.colors.textMuted },
  } as const;
  const palette = tones[tone];

  return (
    <View style={[styles.base, { backgroundColor: palette.background }]}>
      <AppText variant="caption" bold color={palette.text}>
        {label}
      </AppText>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  base: {
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
}));
