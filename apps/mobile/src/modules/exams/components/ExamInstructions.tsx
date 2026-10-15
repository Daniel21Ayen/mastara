// apps/mobile/src/modules/exams/components/ExamInstructions.tsx
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles } from '@/core/theme';
import { AppButton, AppText, Card } from '@/shared/ui';

interface ExamInstructionsProps {
  title: string;
  subtitle?: string;
  questionCount: number;
  minutes: number;
  onStart: () => void;
}

export function ExamInstructions({ title, subtitle, questionCount, minutes, onStart }: ExamInstructionsProps) {
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <Card>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? <AppText muted>{subtitle}</AppText> : null}
        <AppText bold>{t('exam.rule.questions', { count: questionCount })}</AppText>
        <AppText bold>{t('exam.rule.time', { minutes })}</AppText>
      </Card>
      <Card>
        <AppText bold>{t('exam.instructions.title')}</AppText>
        <AppText muted>{t('exam.rule.save')}</AppText>
        <AppText muted>{t('exam.rule.flag')}</AppText>
        <AppText muted>{t('exam.rule.auto')}</AppText>
      </Card>
      <AppButton label={t('exam.start')} onPress={onStart} />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.md },
}));
