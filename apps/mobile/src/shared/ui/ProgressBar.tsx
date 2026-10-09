// apps/mobile/src/shared/ui/ProgressBar.tsx
import { StyleSheet, View } from 'react-native';

import { theme } from '@/core/theme';

interface ProgressBarProps {
  /** 0 to 100. */
  value: number;
  /** Use "onPrimary" on top of a primary-coloured card. */
  tone?: 'primary' | 'onPrimary';
}

export function ProgressBar({ value, tone = 'primary' }: ProgressBarProps) {
  const onPrimary = tone === 'onPrimary';
  const clamped = Math.max(0, Math.min(100, value));

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

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: theme.radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: theme.radius.pill },
});
