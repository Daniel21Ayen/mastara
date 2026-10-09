// apps/mobile/src/modules/coc/screens/CocExamScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { ExamFlow } from '@/modules/exams';
import { AppButton, AppText, Card, Screen, TopBar } from '@/shared/ui';

import { useCocSession } from '../hooks/useCocData';

/** Runs one COC set with the same timed flow as course exams, plus a per-course result breakdown. */
export function CocExamScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const { data, loading, error, reload } = useCocSession(setId ?? '');

  if (data?.canOpen) {
    return (
      <ExamFlow
        examId={data.set.id}
        title={data.set.title[language]}
        subtitle={t('coc.banner')}
        questions={data.questions}
        minutes={data.set.minutes}
        courseTitles={data.courseTitles}
        onExit={() => router.back()}
      />
    );
  }

  return (
    <Screen>
      <TopBar title={t('coc.title')} onBack={() => router.back()} />
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && !data ? <AppText muted>{t('exam.notFound')}</AppText> : null}
      {data && !data.canOpen ? (
        <Card>
          <AppText muted>{t('exam.locked')}</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
