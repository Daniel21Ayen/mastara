import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { useCourseDownloadedVersion, useIsCourseDownloaded } from '@/modules/downloads';
import { ExamsTab } from '@/modules/exams/components/ExamsTab';
import { TestsTab } from '@/modules/quizzes/components/TestsTab';
import { AppButton, AppText, Screen, UnderlineTabs, TopBar } from '@/shared/ui';
import type { UnderlineTabOption } from '@/shared/ui';

import { CourseActionButton } from '../components/CourseActionButton';
import { CourseHeader } from '../components/CourseHeader';
import { MaterialTab } from '../components/MaterialTab';
import { useCourseDetail } from '../hooks/useCourseDetail';

type CourseTabId = 'MATERIAL' | 'TESTS' | 'EXAMS';

export function CourseScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { item, loading, error, reload } = useCourseDetail(courseId ?? '');
  const [tab, setTab] = useState<CourseTabId>('MATERIAL');
  const isDownloaded = useIsCourseDownloaded(courseId ?? '');
  const downloadedVersion = useCourseDownloadedVersion(courseId ?? '');
  const hasUpdate =
    isDownloaded &&
    downloadedVersion !== null &&
    ((item?.course as any)?.contentVersion ?? 1) > downloadedVersion;

  const tabs: UnderlineTabOption<CourseTabId>[] = [
    { value: 'MATERIAL', label: t('course.tab.material') },
    { value: 'TESTS', label: t('course.tab.tests') },
    { value: 'EXAMS', label: t('course.tab.exams') },
  ];

  return (
    <Screen scroll>
      <TopBar title={item?.course.title ?? ''} onBack={() => router.back()} />

      {loading && !item ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error && !item ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && !item ? <AppText muted>{t('course.notFound')}</AppText> : null}

      {item ? (
        <>
          <CourseHeader item={item} />

          <View style={styles.actionRow}>
            <View style={styles.flex}>
              <AppText variant="caption" bold={hasUpdate} color={hasUpdate ? theme.colors.primary : undefined} muted={!hasUpdate}>
                {hasUpdate
                  ? t('course.download.updateAvailable')
                  : isDownloaded
                  ? t('course.download.downloaded')
                  : t('course.download.optional')}
              </AppText>
            </View>
            <CourseActionButton course={item.course} />
          </View>

          <UnderlineTabs options={tabs} value={tab} onChange={setTab} />

          {tab === 'MATERIAL' ? (
            <MaterialTab courseId={item.course.id} access={item.access} course={item.course} />
          ) : null}
          {tab === 'TESTS' ? (
            <TestsTab courseId={item.course.id} access={item.access} course={item.course} />
          ) : null}
          {tab === 'EXAMS' ? (
            <ExamsTab courseId={item.course.id} access={item.access} course={item.course} />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  flex: { flex: 1 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
}));
