import type { Course, Exam } from '@mastara/contracts';
import { canOpenContent, EXAM_KINDS } from '@mastara/domain';
import type { AccessState, ExamKind } from '@mastara/domain';
import type { TranslationKey } from '@mastara/i18n';
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

import { useExams } from '../hooks/useExams';

import { ExamRow } from './ExamRow';

interface KindText {
  tab: TranslationKey;
  title: TranslationKey;
  subtitle: TranslationKey;
}

const KIND_TEXT: Record<ExamKind, KindText> = {
  MID: { tab: 'exams.tab.mid', title: 'exams.title.mid', subtitle: 'exams.sub.mid' },
  FINAL: { tab: 'exams.tab.final', title: 'exams.title.final', subtitle: 'exams.sub.final' },
  MOCK: { tab: 'exams.tab.mock', title: 'exams.title.mock', subtitle: 'exams.sub.mock' },
};

interface ExamsTabProps {
  courseId: string;
  access: AccessState;
  course?: Course;
}

/** Course "Exams" tab: lower tabs Mid, Final, Mock. COC is not here: it opens from Home. */
export function ExamsTab({ courseId, access, course }: ExamsTabProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const [kind, setKind] = useState<ExamKind>('MID');
  const [lockedOpen, setLockedOpen] = useState(false);
  const [downloadPromptOpen, setDownloadPromptOpen] = useState(false);

  const isDownloaded = useIsCourseDownloaded(courseId);
  const { items, loading, error, reload } = useExams(courseId, kind);

  const options: UnderlineTabOption<ExamKind>[] = EXAM_KINDS.map((value) => ({
    value,
    label: t(KIND_TEXT[value].tab),
  }));

  function openExam(exam: Exam, open: boolean) {
    if (!isDownloaded) {
      setDownloadPromptOpen(true);
      return;
    }
    if (!open) {
      setLockedOpen(true);
      return;
    }
    router.push(`/exam/${exam.id}` as Href);
  }

  const fallbackCourse: Course = course ?? {
    id: courseId,
    semesterId: '',
    code: '',
    title: t('course.tab.exams') || 'Course Exam',
    stream: 'COMMON',
  };

  return (
    <View style={styles.wrap}>
      <UnderlineTabs options={options} value={kind} onChange={setKind} />

      <View style={styles.intro}>
        <IconTile icon="exam" solid />
        <View style={styles.text}>
          <AppText variant="bodyLarge" bold>
            {t(KIND_TEXT[kind].title)}
          </AppText>
          <AppText variant="caption" muted>
            {t(KIND_TEXT[kind].subtitle)}
          </AppText>
        </View>
      </View>

      {loading && items.length === 0 ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!loading && !error && items.length === 0 ? <AppText muted>{t('exams.empty')}</AppText> : null}

      {items.map(({ exam, university }) => (
        <ExamRow
          key={exam.id}
          exam={exam}
          university={university}
          open={canOpenContent(access, exam.isFree)}
          onPress={openExam}
        />
      ))}

      <LockedSheet visible={lockedOpen} onClose={() => setLockedOpen(false)} />
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
