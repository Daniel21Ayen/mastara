// apps/mobile/src/shared/ui/Badge.tsx
import { View } from 'react-native';

import type { StatusTone } from '@mastara/ui-tokens';
import { createStyles, useTheme } from '@/core/theme';

import { AppText } from './AppText';

export type MobileBadgeTone = StatusTone | 'muted';

interface BadgeProps {
  label: string;
  tone?: MobileBadgeTone;
}

export function Badge({ label, tone = 'primary' }: BadgeProps) {
  const theme = useTheme();
  const styles = useStyles();

  const tones: Record<MobileBadgeTone, { background: string; text: string }> = {
    primary: { background: theme.colors.primarySoft, text: theme.colors.primary },
    success: { background: theme.colors.successSoft, text: theme.colors.success },
    warning: { background: theme.colors.primarySoft, text: theme.colors.primary },
    danger: { background: theme.colors.dangerSoft, text: theme.colors.danger },
    neutral: { background: theme.colors.border, text: theme.colors.textMuted },
    muted: { background: theme.colors.border, text: theme.colors.textMuted },
  };
  const palette = tones[tone] ?? tones.primary;

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
