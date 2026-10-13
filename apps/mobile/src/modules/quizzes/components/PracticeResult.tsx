// apps/mobile/src/modules/quizzes/components/PracticeResult.tsx
import { View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppButton, AppText, Card, ProgressBar } from '@/shared/ui';

interface PracticeResultProps {
  correct: number;
  total: number;
  onAgain: () => void;
  onBack: () => void;
}

export function PracticeResult({ correct, total, onAgain, onBack }: PracticeResultProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <View style={styles.wrap}>
      <Card>
        <AppText variant="heading" accessibilityRole="header">
          {t('result.title')}
        </AppText>
        <AppText variant="title" color={theme.colors.primary}>
          {t('result.score', { correct, total })}
        </AppText>
        <ProgressBar value={percent} />
        <AppText muted>{t('result.percent', { n: percent })}</AppText>
      </Card>
      <AppButton label={t('result.again')} onPress={onAgain} />
      <AppButton label={t('result.back')} variant="outline" onPress={onBack} />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.md },
}));
