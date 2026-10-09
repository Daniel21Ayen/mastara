// apps/mobile/src/modules/exams/components/ExamTimerBadge.tsx
import { formatClock } from '@mastara/domain';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText } from '@/shared/ui';

const LOW_MS = 60_000;

/** Time left. Turns red in the last minute (the number is shown too, so colour is not the only signal). */
export function ExamTimerBadge({ remainingMs }: { remainingMs: number }) {
  const { t } = useI18n();
  const low = remainingMs <= LOW_MS;
  const text = formatClock(remainingMs);

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={`${t('exam.timeLeft')} ${text}`}
      style={[styles.badge, low ? styles.low : styles.normal]}
    >
      <AppText bold color={low ? theme.colors.danger : theme.colors.primary}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  normal: { backgroundColor: theme.colors.primarySoft },
  low: { backgroundColor: theme.colors.dangerSoft },
});
