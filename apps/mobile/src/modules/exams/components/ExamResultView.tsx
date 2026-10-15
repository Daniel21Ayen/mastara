// apps/mobile/src/modules/exams/components/ExamResultView.tsx
import type { ExamScore } from '@mastara/domain';
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText, Card, ProgressBar } from '@/shared/ui';

interface ExamResultViewProps {
  score: ExamScore;
  /** When given, a per-course breakdown is shown (COC mixes courses). */
  courseTitles?: Record<string, string>;
  /** Opens the answer review. Not shown when there is nothing to review. */
  onReview?: () => void;
  onBack: () => void;
}

const percentOf = (correct: number, total: number) => (total > 0 ? Math.round((correct / total) * 100) : 0);

export function ExamResultView({ score, courseTitles, onReview, onBack }: ExamResultViewProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const percent = percentOf(score.correct, score.total);
  const lines = Object.entries(score.byCourse);

  return (
    <View style={styles.wrap}>
      <Card>
        <AppText variant="heading" accessibilityRole="header">
          {t('exam.result.title')}
        </AppText>
        <AppText variant="title" color={theme.accents.fuchsia.main}>
          {t('result.score', { correct: score.correct, total: score.total })}
        </AppText>
        <ProgressBar value={percent} accent="fuchsia" />
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

      {onReview ? <AppButton label={t('exam.result.review')} onPress={onReview} /> : null}
      <AppButton label={t('exam.result.back')} variant={onReview ? 'outline' : 'primary'} onPress={onBack} />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.md },
  line: { gap: theme.spacing.xs },
  lineText: { flexDirection: 'row', justifyContent: 'space-between' },
}));
