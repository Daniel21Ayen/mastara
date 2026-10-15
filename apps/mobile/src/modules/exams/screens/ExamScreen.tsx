// apps/mobile/src/modules/exams/screens/ExamScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useTheme } from '@/core/theme';
import { AppText, Card, ErrorNotice, Screen, TopBar } from '@/shared/ui';

import { ExamFlow } from '../components/ExamFlow';
import { useExamData } from '../hooks/useExamData';

export function ExamScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { data, loading, error, reload } = useExamData(examId ?? '');

  if (data?.canOpen) {
    const kind = t(`exams.tab.${data.exam.kind.toLowerCase() as 'mid' | 'final' | 'mock'}`);
    return (
      <ExamFlow
        examId={data.exam.id}
        title={`${data.university.shortName} (${kind})`}
        subtitle={data.university.name}
        questions={data.questions}
        minutes={data.exam.minutes}
        onExit={() => router.back()}
      />
    );
  }

  return (
    <Screen>
      <TopBar title="" onBack={() => router.back()} />
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!loading && !error && !data ? <AppText muted>{t('exam.notFound')}</AppText> : null}
      {data && !data.canOpen ? (
        <Card>
          <AppText muted>{t('exam.locked')}</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
