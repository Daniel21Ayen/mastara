// apps/mobile/src/modules/exams/components/ExamResultView.tsx
import type { ExamScore } from '@mastara/domain';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppButton, AppText, Card, ProgressBar } from '@/shared/ui';

interface ExamResultViewProps {
  score: ExamScore;
  /** When given, a per-course breakdown is shown (COC mixes courses). */
  courseTitles?: Record<string, string>;
  onBack: () => void;
}

const percentOf = (correct: number, total: number) => (total > 0 ? Math.round((correct / total) * 100) : 0);

export function ExamResultView({ score, courseTitles, onBack }: ExamResultViewProps) {
  const { t } = useI18n();
  const percent = percentOf(score.correct, score.total);
  const lines = Object.entries(score.byCourse);

  return (
    <View style={styles.wrap}>
      <Card>
        <AppText variant="heading" accessibilityRole="header">
          {t('exam.result.title')}
        </AppText>
        <AppText variant="title" color={theme.colors.primary}>
          {t('result.score', { correct: score.correct, total: score.total })}
        </AppText>
        <ProgressBar value={percent} />
        <AppText muted>{t('result.percent', { n: percent })}</AppText>
      </Card>

      {courseTitles && lines.length > 1 ? (
        <Card>
          <AppText bold>{t('exam.result.byCourse')}</AppText>
          {lines.map(([courseId, line]) => (
            <View key={courseId} style={styles.line}>
              <View style={styles.lineText}>
                <AppText variant="caption">{courseTitles[courseId] ?? courseId}</AppText>
                <AppText variant="caption" bold>
                  {line.correct}/{line.total}
                </AppText>
              </View>
              <ProgressBar value={percentOf(line.correct, line.total)} />
            </View>
          ))}
        </Card>
      ) : null}

      <AppButton label={t('exam.result.back')} onPress={onBack} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  line: { gap: theme.spacing.xs },
  lineText: { flexDirection: 'row', justifyContent: 'space-between' },
});
