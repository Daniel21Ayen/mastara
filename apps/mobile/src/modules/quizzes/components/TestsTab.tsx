import type { Course, QuizChapter } from '@mastara/contracts';
import { QUIZ_NUMBERS } from '@mastara/domain';
import type { AccessState, QuizNumber } from '@mastara/domain';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { LockedSheet } from '@/modules/access';
import { DownloadRequiredSheet } from '@/modules/courses/components/DownloadRequiredSheet';
import { useIsCourseDownloaded } from '@/modules/downloads';
import { AppText, ErrorNotice, IconTile, UnderlineTabs } from '@/shared/ui';
import type { UnderlineTabOption } from '@/shared/ui';

import { useQuizChapters } from '../hooks/useQuizChapters';

import { QuizChapterRow } from './QuizChapterRow';

interface TestsTabProps {
  courseId: string;
  access: AccessState;
  course?: Course;
}

/** Course "Tests" tab: lower tabs Quiz 1, 2, 3, each listing its chapters. */
export function TestsTab({ courseId, access, course }: TestsTabProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const [quizNo, setQuizNo] = useState<QuizNumber>(1);
  const [lockedOpen, setLockedOpen] = useState(false);
  const [downloadPromptOpen, setDownloadPromptOpen] = useState(false);

  const isDownloaded = useIsCourseDownloaded(courseId);
  const { items, loading, error, reload } = useQuizChapters(courseId, quizNo);

  const options: UnderlineTabOption<`${QuizNumber}`>[] = QUIZ_NUMBERS.map((n) => ({
    value: `${n}` as `${QuizNumber}`,
    label: t('tests.quiz', { n }),
  }));

  function openChapter(chapter: QuizChapter, open: boolean) {
    if (!isDownloaded) {
      setDownloadPromptOpen(true);
      return;
    }
    if (!open) {
      setLockedOpen(true);
      return;
    }
    router.push(`/quiz/${chapter.id}` as Href);
  }

  const fallbackCourse: Course = course ?? {
    id: courseId,
    semesterId: '',
    code: '',
    title: t('tests.title'),
    stream: 'COMMON',
  };

  return (
    <View style={styles.wrap}>
      <UnderlineTabs options={options} value={`${quizNo}` as `${QuizNumber}`} onChange={(value) => setQuizNo(Number(value) as QuizNumber)} />

      <View style={styles.intro}>
        <IconTile icon="quiz" solid />
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
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!loading && !error && items.length === 0 ? <AppText muted>{t('tests.empty')}</AppText> : null}

      {items.map(({ chapter, best }) => (
        <QuizChapterRow key={chapter.id} chapter={chapter} access={access} best={best} onPress={openChapter} />
      ))}

      <LockedSheet
        visible={lockedOpen}
        courseId={courseId}
        courseTitle={course?.title}
        onClose={() => setLockedOpen(false)}
      />
      <DownloadRequiredSheet
        visible={downloadPromptOpen}
        course={fallbackCourse}
        onClose={() => setDownloadPromptOpen(false)}
      />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.md },
  intro: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  text: { flex: 1, gap: 2 },
}));
