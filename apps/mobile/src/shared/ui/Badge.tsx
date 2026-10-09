// apps/mobile/src/shared/ui/Badge.tsx
import { StyleSheet, View } from 'react-native';

import { theme } from '@/core/theme';

import { AppText } from './AppText';

interface BadgeProps {
  label: string;
  tone?: 'primary' | 'danger' | 'muted';
}

export function Badge({ label, tone = 'primary' }: BadgeProps) {
  const palette = TONES[tone];

  return (
    <View style={[styles.base, { backgroundColor: palette.background }]}>
      <AppText variant="caption" bold color={palette.text}>
        {label}
      </AppText>
    </View>
  );
}

const TONES = {
  primary: { background: theme.colors.primarySoft, text: theme.colors.primary },
  danger: { background: theme.colors.dangerSoft, text: theme.colors.danger },
  muted: { background: theme.colors.border, text: theme.colors.text },
} as const;

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignSelf: 'flex-start',
  },
});
