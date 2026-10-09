// apps/mobile/src/modules/quizzes/components/TestsTab.tsx
import type { QuizChapter } from '@mastara/contracts';
import { QUIZ_NUMBERS } from '@mastara/domain';
import type { AccessState, QuizNumber } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { LockedSheet } from '@/modules/access';
import { AppButton, AppText, Icon, UnderlineTabs } from '@/shared/ui';
import type { UnderlineTabOption } from '@/shared/ui';

import { useQuizChapters } from '../hooks/useQuizChapters';

import { QuizChapterRow } from './QuizChapterRow';

interface TestsTabProps {
  courseId: string;
  access: AccessState;
}

/** Course "Tests" tab: lower tabs Quiz 1, 2, 3, each listing its chapters. */
export function TestsTab({ courseId, access }: TestsTabProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [quizNo, setQuizNo] = useState<QuizNumber>(1);
  const [lockedOpen, setLockedOpen] = useState(false);
  const { items, loading, error, reload } = useQuizChapters(courseId, quizNo);

  const options: UnderlineTabOption<`${QuizNumber}`>[] = QUIZ_NUMBERS.map((n) => ({
    value: `${n}` as `${QuizNumber}`,
    label: t('tests.quiz', { n }),
  }));

  function openChapter(chapter: QuizChapter, open: boolean) {
    if (!open) setLockedOpen(true);
    else router.push(`/quiz/${chapter.id}` as Href);
  }

  return (
    <View style={styles.wrap}>
      <UnderlineTabs options={options} value={`${quizNo}` as `${QuizNumber}`} onChange={(value) => setQuizNo(Number(value) as QuizNumber)} />

      <View style={styles.intro}>
        <View style={styles.tile}>
          <Icon name="note" color={theme.colors.primary} />
        </View>
        <View style={styles.text}>
          <AppText variant="bodyLarge" bold>
            {t('tests.title')}
          </AppText>
          <AppText variant="caption" muted>
            {t('tests.sub')}
          </AppText>
        </View>
      </View>

      {loading && items.length === 0 ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && items.length === 0 ? <AppText muted>{t('tests.empty')}</AppText> : null}

      {items.map(({ chapter, best }) => (
        <QuizChapterRow key={chapter.id} chapter={chapter} access={access} best={best} onPress={openChapter} />
      ))}

      <LockedSheet visible={lockedOpen} onClose={() => setLockedOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  intro: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  tile: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
