import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { useIsCourseDownloaded } from '@/modules/downloads';
import { ExamsTab } from '@/modules/exams/components/ExamsTab';
import { TestsTab } from '@/modules/quizzes/components/TestsTab';
import { AppButton, AppText, Icon, Screen, SegmentedControl, TopBar } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

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

  const tabs: SegmentOption<CourseTabId>[] = [
    { value: 'MATERIAL', label: t('course.tab.material') },
    { value: 'TESTS', label: t('course.tab.tests') },
    { value: 'EXAMS', label: t('course.tab.exams') },
  ];

  return (
    <Screen scroll>
      <TopBar title={item?.course.title ?? ''} onBack={() => router.back()} />

      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && !item ? <AppText muted>{t('course.notFound')}</AppText> : null}

      {item ? (
        <>
          <CourseHeader item={item} />

          <View style={styles.actionRow}>
            <View style={styles.flex}>
              <AppText variant="caption" muted>
                {isDownloaded
                  ? t('course.download.downloaded') || 'Course is downloaded locally'
                  : t('course.download.required.title') || 'Download required to access content'}
              </AppText>
            </View>
            <CourseActionButton course={item.course} />
          </View>

          {!isDownloaded && (
            <View style={styles.banner}>
              <Icon name="download" size={18} color={theme.accents.amber.main} />
              <AppText variant="caption" color={theme.accents.amber.main} bold style={styles.flex}>
                {t('course.download.required.body') ||
                  'Each course must be downloaded before a student can access or select its materials.'}
              </AppText>
            </View>
          )}

          <SegmentedControl options={tabs} value={tab} onChange={setTab} />

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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.accents.amber.soft,
    borderColor: theme.accents.amber.track,
    borderWidth: 1,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
}));
