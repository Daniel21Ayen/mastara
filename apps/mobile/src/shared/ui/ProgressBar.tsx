// apps/mobile/src/shared/ui/ProgressBar.tsx
import { View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';
import type { AccentName } from '@/core/theme';

interface ProgressBarProps {
  /** 0 to 100. */
  value: number;
  /** Use "onPrimary" on top of a primary-coloured card. */
  tone?: 'primary' | 'onPrimary';
  /** Colour of the bar, for example the course's accent. Ignored with tone "onPrimary". */
  accent?: AccentName;
}

export function ProgressBar({ value, tone = 'primary', accent = 'blue' }: ProgressBarProps) {
  const theme = useTheme();
  const styles = useStyles();
  const onPrimary = tone === 'onPrimary';
  const clamped = Math.max(0, Math.min(100, value));
  const colour = theme.accents[accent];

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[styles.track, { backgroundColor: onPrimary ? theme.colors.onPrimarySoft : theme.colors.primarySoft }]}
    >
      <View
        style={[
          styles.fill,
          { width: `${clamped}%`, backgroundColor: onPrimary ? theme.colors.onPrimary : theme.colors.primary },
        ]}
      />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  track: { height: 6, borderRadius: theme.radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: theme.radius.pill },
}));
