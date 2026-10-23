// apps/mobile/src/modules/downloads/screens/DownloadsScreen.tsx
import type { CocSet, Exam, QuizChapter, Topic, University } from '@mastara/contracts';
import { formatBytes } from '@mastara/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { downloadStore } from '@/core/downloads';
import type { DownloadedUnit, DownloadKind } from '@/core/downloads';
import { useI18n } from '@/core/i18n';
import { accentForKey, createStyles, useTheme } from '@/core/theme';
import { useTimeAgo } from '@/shared/hooks';
import { AppButton, AppText, BottomSheet, Card, Icon, IconTile, Screen, TopBar } from '@/shared/ui';
import type { IconName } from '@/shared/ui';

import { useDownloadList } from '../hooks/useDownloads';

const SECTIONS: readonly { kind: DownloadKind; icon: IconName; title: Parameters<ReturnType<typeof useI18n>['t']>[0] }[] = [
  { kind: 'COURSE', icon: 'course', title: 'mycourses.title' },
  { kind: 'TOPIC', icon: 'module', title: 'downloads.section.material' },
  { kind: 'QUIZ_CHAPTER', icon: 'quiz', title: 'downloads.section.tests' },
  { kind: 'EXAM', icon: 'exam', title: 'downloads.section.exams' },
  { kind: 'COC_SET', icon: 'trophy', title: 'downloads.section.coc' },
];

/** Settings → Downloads: what is saved on this phone, how much space it uses, and a way to delete it. */
export function DownloadsScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t, language } = useI18n();
  const router = useRouter();
  const timeAgo = useTimeAgo();
  const { units, totalBytes, loaded } = useDownloadList();
  const [deleting, setDeleting] = useState<DownloadedUnit | 'ALL' | null>(null);

  /** The name shown, in the student's language, built from the saved list entry. */
  function nameOf(unit: DownloadedUnit): { title: string; subtitle: string } {
    switch (unit.kind) {
      case 'COURSE': {
        const course = unit.meta as { title?: string };
        return {
          title: course?.title ?? unit.title,
          subtitle: t('course.download.downloaded') || 'Full course downloaded',
        };
      }
      case 'TOPIC': {
        const topic = unit.meta as Topic;
        return {
          title: topic.kind === 'MODULE' ? t('topic.module', { n: topic.number }) : topic.title[language],
          subtitle: topic.kind === 'MODULE' ? topic.title[language] : t('downloads.kind.note'),
        };
      }
      case 'QUIZ_CHAPTER': {
        const chapter = unit.meta as QuizChapter;
        return {
          title: `${t('tests.quiz', { n: chapter.quizNo })} · ${t('tests.chapter', { n: chapter.chapterNumber })}`,
          subtitle: t('tests.meta', { count: chapter.questionCount, minutes: chapter.minutes }),
        };
      }
      case 'EXAM': {
        const { exam, university } = unit.meta as { exam: Exam; university: University };
        return {
          title: `${university.shortName} (${t(`exams.tab.${exam.kind.toLowerCase() as 'mid' | 'final' | 'mock'}`)})`,
          subtitle: t('exams.meta', { count: exam.questionCount, minutes: exam.minutes }),
        };
      }
      case 'COC_SET': {
        const set = unit.meta as CocSet;
        return {
          title: set.title[language],
          subtitle: t('coc.setMeta', { count: set.questionCount, minutes: set.minutes, courses: set.courseCount }),
        };
      }
    }
  }

  async function confirmDelete() {
    const target = deleting;
    setDeleting(null);
    if (target === 'ALL') {
      await downloadStore.removeAll();
    } else if (target) {
      if (target.kind === 'COURSE') {
        const courseId = target.courseId ?? target.unitId.replace('COURSE:', '');
        await downloadStore.removeCourse(courseId);
      } else {
        await downloadStore.remove(target.unitId);
      }
    }
  }

  return (
    <Screen scroll>
      <TopBar title={t('downloads.title')} onBack={() => router.back()} />

      <Card>
        <View style={styles.summary}>
          <IconTile icon="download" solid size={48} />
          <View style={styles.flex}>
            <AppText bold variant="bodyLarge">
              {t('downloads.summary', { count: units.length, size: formatBytes(totalBytes) })}
            </AppText>
            <AppText variant="caption" muted>
              {t('downloads.note')}
            </AppText>
          </View>
        </View>
        {units.length > 0 ? (
          <AppButton label={t('downloads.deleteAll')} variant="outline" onPress={() => setDeleting('ALL')} />
        ) : null}
      </Card>

      {loaded && units.length === 0 ? <AppText muted>{t('downloads.empty')}</AppText> : null}

      {SECTIONS.map((section) => {
        const items = units.filter((unit) => unit.kind === section.kind);
        if (items.length === 0) return null;
        return (
          <View key={section.kind} style={styles.section}>
            <AppText bold accessibilityRole="header">
              {t(section.title)}
            </AppText>
            {items.map((unit) => {
              const { title, subtitle } = nameOf(unit);
              return (
                <View key={unit.unitId} style={styles.row}>
                  <IconTile icon={section.icon} accent={accentForKey(unit.unitId)} />
                  <View style={styles.flex}>
                    <AppText bold>{title}</AppText>
                    <AppText variant="caption" muted>
                      {subtitle}
                    </AppText>
                    <AppText variant="caption" muted>
                      {`${formatBytes(unit.bytes)} · ${timeAgo(new Date(unit.downloadedAt).toISOString())}`}
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('downloads.delete')}
                    hitSlop={8}
                    onPress={() => setDeleting(unit)}
                    style={styles.trash}
                  >
                    <Icon name="trash" size={24} color={theme.colors.danger} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        );
      })}

      <BottomSheet
        visible={deleting !== null}
        title={deleting === 'ALL' ? t('downloads.deleteAll.title') : t('download.delete.title')}
        onClose={() => setDeleting(null)}
      >
        <AppText muted>{deleting === 'ALL' ? t('downloads.deleteAll.body') : t('download.delete.body')}</AppText>
        <AppButton label={t('download.delete.confirm')} onPress={() => void confirmDelete()} />
        <AppButton label={t('common.cancel')} variant="outline" onPress={() => setDeleting(null)} />
      </BottomSheet>
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  flex: { flex: 1, gap: 2 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  section: { gap: theme.spacing.sm },
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  trash: { width: theme.minTouchTarget, height: theme.minTouchTarget, alignItems: 'center', justifyContent: 'center' },
}));
