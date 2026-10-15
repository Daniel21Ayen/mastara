// apps/mobile/src/modules/quizzes/screens/PracticeScreen.tsx
import type { Question, QuizChapter } from '@mastara/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { useScrollList, useVisibleIndex } from '@/shared/hooks';
import { AppText, Card, ErrorNotice, ProgressBar, Screen, TopBar } from '@/shared/ui';

import { PracticeQuestionItem } from '../components/PracticeQuestionItem';
import { PracticeResult } from '../components/PracticeResult';
import { usePracticeData } from '../hooks/usePracticeData';
import { usePracticeSession } from '../hooks/usePracticeSession';

function PracticeRunner({ chapter, questions }: { chapter: QuizChapter; questions: Question[] }) {
  const theme = useTheme();
  const styles = useStyles();
  const { t, language } = useI18n();
  const router = useRouter();
  const session = usePracticeSession(chapter.id, questions);
  const { state } = session;
  const { listRef, scrollTo, onScrollToIndexFailed } = useScrollList<Question>();

  // The question at the top of the screen is the "current" one (shown in the header and saved to return to).
  const { onViewableItemsChanged, viewabilityConfig } = useVisibleIndex(session.goto);

  // Back where the student was after the app was closed.
  useEffect(() => {
    if (session.ready && state.index > 0) setTimeout(() => scrollTo(state.index), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.ready]);

  const renderItem = useCallback(
    ({ item, index }: { item: Question; index: number }) => (
      <PracticeQuestionItem
        question={item}
        number={index + 1}
        total={session.total}
        index={index}
        isLast={index === session.total - 1}
        lang={language}
        answer={state.answers[item.id]}
        checked={item.id in state.results}
        correct={state.results[item.id]}
        onChoose={session.chooseFor}
        onText={session.setTextFor}
        onCheck={session.checkFor}
        onNext={scrollTo}
        onFinish={() => void session.finish()}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.answers, state.results, session.total, language, scrollTo],
  );

  if (!session.ready) return <Screen><ActivityIndicator color={theme.colors.primary} /></Screen>;

  const title = `${t('tests.quiz', { n: chapter.quizNo })} · ${t('tests.chapter', { n: chapter.chapterNumber })}`;

  return (
    <Screen scroll={state.finished}>
      <TopBar title={title} onBack={() => router.back()} />

      {state.finished ? (
        <PracticeResult
          correct={session.correctTotal}
          total={session.total}
          onAgain={session.restart}
          onBack={() => router.back()}
        />
      ) : (
        <View style={styles.wrap}>
          <View>
            <ProgressBar value={(session.answered / session.total) * 100} />
            <AppText variant="caption" muted>
              {t('practice.progress', { current: state.index + 1, total: session.total })}
            </AppText>
          </View>

          <FlatList
            ref={listRef}
            style={styles.flex}
            contentContainerStyle={styles.list}
            data={questions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            extraData={[state.answers, state.results, language]}
            // Only the questions near the screen are built: a long quiz with formulas stays light on memory.
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            onScrollToIndexFailed={onScrollToIndexFailed}
          />
        </View>
      )}
    </Screen>
  );
}

export function PracticeScreen() {
  const theme = useTheme();
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
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!loading && !error && !data ? <AppText muted>{t('practice.notFound')}</AppText> : null}
      {data && !data.canOpen ? (
        <Card>
          <AppText muted>{t('practice.locked')}</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const useStyles = createStyles((theme) => ({
  wrap: { flex: 1, gap: theme.spacing.md },
  flex: { flex: 1 },
  list: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
}));
