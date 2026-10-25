// apps/mobile/src/modules/exams/components/ExamRow.tsx
import type { Exam, University } from '@mastara/contracts';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { accentForKey, createStyles, useTheme } from '@/core/theme';
import { AppText, Badge, Icon, LetterTile } from '@/shared/ui';
import { DownloadButton } from '@/modules/downloads';

import { examDownload } from '../lib/examDownload';

interface ExamRowProps {
  exam: Exam;
  university: University;
  open: boolean;
  onPress: (exam: Exam, open: boolean) => void;
}

export const ExamRow = memo(function ExamRow({ exam, university, open, onPress }: ExamRowProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const kindLabel = t(`exams.tab.${exam.kind.toLowerCase() as 'mid' | 'final' | 'mock'}`);

  let trailing;
  if (!open) trailing = <Icon name="lock" color={theme.colors.textMuted} />;
  else if (exam.isFree) trailing = <Badge label={t('exams.sample')} tone="primary" />;
  else trailing = <Icon name="chevron" color={theme.colors.primary} />;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(exam, open)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <LetterTile label={university.shortName.slice(0, 2).toUpperCase()} accent="blue" round />
      <View style={styles.text}>
        <AppText bold>{`${university.shortName} (${kindLabel})`}</AppText>
        <AppText variant="caption" muted>
          {university.name}
        </AppText>
        <AppText variant="caption" muted>
          {t('exams.meta', { count: exam.questionCount, minutes: exam.minutes })}
        </AppText>
      </View>
      {open ? <DownloadButton unit={examDownload({ exam, university })} /> : null}
      {trailing}
    </Pressable>
  );
});

const useStyles = createStyles((theme) => ({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  pressed: { opacity: 0.85 },
  text: { flex: 1, gap: 2 },
}));
