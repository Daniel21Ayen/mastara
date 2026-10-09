// apps/mobile/src/modules/quizzes/screens/PracticeScreen.tsx
import type { Question, QuizChapter } from '@mastara/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { QuestionView } from '@/modules/assessment';
import { AppButton, AppText, Card, ProgressBar, Screen, TopBar } from '@/shared/ui';

import { PracticeResult } from '../components/PracticeResult';
import { usePracticeData } from '../hooks/usePracticeData';
import { usePracticeSession } from '../hooks/usePracticeSession';

function PracticeRunner({ chapter, questions }: { chapter: QuizChapter; questions: Question[] }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const session = usePracticeSession(chapter.id, questions);
  const { question, state } = session;

  if (!session.ready) return <Screen><ActivityIndicator color={theme.colors.primary} /></Screen>;

  const title = `${t('tests.quiz', { n: chapter.quizNo })} · ${t('tests.chapter', { n: chapter.chapterNumber })}`;
  const needsCheck = question?.type === 'MULTIPLE' || question?.type === 'SHORT';
  const answered = Object.keys(state.results).length;

  return (
    <Screen scroll>
      <TopBar title={title} onBack={() => router.back()} />

      {state.finished ? (
        <PracticeResult
          correct={session.correctTotal}
          total={session.total}
          onAgain={session.restart}
          onBack={() => router.back()}
        />
      ) : question ? (
        <>
          <ProgressBar value={(answered / session.total) * 100} />
          <AppText variant="caption" muted>
            {t('practice.progress', { current: state.index + 1, total: session.total })}
          </AppText>

          <Card>
            <QuestionView
              question={question}
              lang={language}
              answer={session.answer}
              checked={session.checked}
              correct={session.correct}
              onChoose={session.choose}
              onText={session.setText}
            />
          </Card>

          <View style={styles.actions}>
            <View style={styles.flex}>
              <AppButton
                label={t('practice.previous')}
                variant="outline"
                disabled={state.index === 0}
                onPress={() => session.move(-1)}
              />
            </View>
            <View style={styles.flex}>
              {!session.checked && needsCheck ? (
                <AppButton label={t('practice.check')} disabled={!session.canCheck} onPress={session.check} />
              ) : (
                <AppButton
                  label={session.isLast ? t('practice.finish') : t('practice.next')}
                  disabled={!session.checked}
                  onPress={session.isLast ? () => void session.finish() : () => session.move(1)}
                />
              )}
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

export function PracticeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const { data, loading, error, reload } = usePracticeData(chapterId ?? '');

  if (data?.canOpen && data.questions.length > 0) {
    return <PracticeRunner chapter={data.chapter} questions={data.questions} />;
  }

  return (
    <Screen>
      <TopBar title="" onBack={() => router.back()} />
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {error ? <AppButton label={t('common.retry')} variant="outline" onPress={reload} /> : null}
      {!loading && !error && !data ? <AppText muted>{t('practice.notFound')}</AppText> : null}
      {data && !data.canOpen ? (
        <Card>
          <AppText muted>{t('practice.locked')}</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  flex: { flex: 1 },
});
