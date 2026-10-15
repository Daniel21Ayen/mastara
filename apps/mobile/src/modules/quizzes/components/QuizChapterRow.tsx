// apps/mobile/src/modules/quizzes/components/QuizChapterRow.tsx
import type { QuizChapter } from '@mastara/contracts';
import { canOpenContent } from '@mastara/domain';
import type { AccessState } from '@mastara/domain';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { accentForKey, createStyles, useTheme } from '@/core/theme';
import { DownloadButton } from '@/modules/downloads';
import { AppText, Badge, Icon, NumberCircle } from '@/shared/ui';

import { chapterDownload } from '../lib/chapterDownload';

interface QuizChapterRowProps {
  chapter: QuizChapter;
  access: AccessState;
  best: { correct: number; total: number } | null;
  onPress: (chapter: QuizChapter, open: boolean) => void;
}

export function QuizChapterRow({ chapter, access, best, onPress }: QuizChapterRowProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const open = canOpenContent(access, chapter.isFree);

  let trailing;
  if (!open) trailing = <Icon name="lock" color={theme.colors.danger} />;
  else if (best) trailing = <Badge label={t('tests.best', { score: `${best.correct}/${best.total}` })} />;
  else if (chapter.isFree && access !== 'PAID') trailing = <Badge label={t('topic.free')} />;
  else trailing = <Icon name="chevron" color={theme.colors.textMuted} />;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(chapter, open)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <NumberCircle value={chapter.chapterNumber} accent={accentForKey(chapter.id)} />
      <View style={styles.text}>
        <AppText bold>{`${t('tests.quiz', { n: chapter.quizNo })} · ${t('tests.chapter', { n: chapter.chapterNumber })}`}</AppText>
        <AppText variant="caption" muted>
          {t('tests.meta', { count: chapter.questionCount, minutes: chapter.minutes })}
        </AppText>
      </View>
      {open ? <DownloadButton unit={chapterDownload(chapter)} /> : null}
      {trailing}
    </Pressable>
  );
}

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
