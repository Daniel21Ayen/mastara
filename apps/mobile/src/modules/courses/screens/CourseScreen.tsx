// apps/mobile/src/modules/courses/screens/CourseScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { ExamsTab } from '@/modules/exams';
import { TestsTab } from '@/modules/quizzes';
import { AppButton, AppText, Screen, SegmentedControl, TopBar } from '@/shared/ui';
import type { SegmentOption } from '@/shared/ui';

import { CourseHeader } from '../components/CourseHeader';
import { MaterialTab } from '../components/MaterialTab';
import { useCourseDetail } from '../hooks/useCourseDetail';

type CourseTabId = 'MATERIAL' | 'TESTS' | 'EXAMS';

export function CourseScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { item, loading, error, reload } = useCourseDetail(courseId ?? '');
  const [tab, setTab] = useState<CourseTabId>('MATERIAL');

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
          <SegmentedControl options={tabs} value={tab} onChange={setTab} />

          {tab === 'MATERIAL' ? <MaterialTab courseId={item.course.id} access={item.access} /> : null}
          {tab === 'TESTS' ? <TestsTab courseId={item.course.id} access={item.access} /> : null}
          {tab === 'EXAMS' ? <ExamsTab courseId={item.course.id} access={item.access} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
