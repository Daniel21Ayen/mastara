// apps/mobile/src/modules/exams/components/ExamReview.tsx
import type { Question } from '@mastara/contracts';
import { gradeAnswer, hasAnswer } from '@mastara/domain';
import type { Answer, ContentLang } from '@mastara/domain';
import { memo, useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles } from '@/core/theme';
import { QuestionView } from '@/modules/assessment';
import { useScrollList } from '@/shared/hooks';
import { AppButton, AppText, Badge, Card } from '@/shared/ui';

interface ExamReviewProps {
  questions: readonly Question[];
  /** What the student answered, by question ID. Missing = left blank. */
  answers: Readonly<Record<string, Answer>>;
  onBack: () => void;
}

/**
 * After an exam or COC set: every question again, in one scrolling list, with the student's answer, the correct answer
 * and the explanation (hidden until the student taps Show). Only the questions near the screen are built.
 */
export function ExamReview({ questions, answers, onBack }: ExamReviewProps) {
  const styles = useStyles();
  const { t, language } = useI18n();
  const [open, setOpen] = useState<Readonly<Record<string, boolean>>>({});
  const { listRef, scrollTo, onScrollToIndexFailed } = useScrollList<Question>();

  // Kept here, not inside each item, so a Show/Hide choice survives scrolling away and back.
  const toggle = useCallback((id: string) => setOpen((current) => ({ ...current, [id]: !current[id] })), []);

  const renderItem = useCallback(
    ({ item, index }: { item: Question; index: number }) => (
      <ReviewItem
        question={item}
        number={index + 1}
        total={questions.length}
        index={index}
        isLast={index === questions.length - 1}
        lang={language}
        answer={answers[item.id]}
        explanationOpen={Boolean(open[item.id])}
        onToggle={toggle}
        onNext={scrollTo}
      />
    ),
    [questions.length, language, answers, open, toggle, scrollTo],
  );

  return (
    <View style={styles.wrap}>
      <AppText variant="heading" accessibilityRole="header">
        {t('review.title')}
      </AppText>
      <FlatList
        ref={listRef}
        onScrollToIndexFailed={onScrollToIndexFailed}
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={questions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={open}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        ListFooterComponent={<AppButton label={t('review.backToResult')} onPress={onBack} />}
      />
    </View>
  );
}

interface ReviewItemProps {
  question: Question;
  number: number;
  total: number;
  index: number;
  isLast: boolean;
  lang: ContentLang;
  answer: Answer | undefined;
  explanationOpen: boolean;
  onToggle: (questionId: string) => void;
  onNext: (index: number) => void;
}

const ReviewItem = memo(function ReviewItem({
  question,
  number,
  total,
  index,
  isLast,
  lang,
  answer,
  explanationOpen,
  onToggle,
  onNext,
}: ReviewItemProps) {
  const styles = useStyles();
  const { t } = useI18n();

  const skipped = !hasAnswer(answer);
  const correct = !skipped && answer !== undefined && gradeAnswer(question, answer);
  const status = skipped ? 'skipped' : correct ? 'correct' : 'incorrect';
  const tone = skipped ? 'muted' : correct ? 'primary' : 'danger';

  return (
    <Card>
      <View style={styles.info}>
        <AppText variant="caption" muted style={styles.flex}>
          {t('practice.progress', { current: number, total })}
        </AppText>
        <Badge label={t(`review.status.${status}`)} tone={tone} />
      </View>
      <QuestionView
        question={question}
        lang={lang}
        answer={answer}
        checked
        correct={correct}
        skipped={skipped}
        explanationOpen={explanationOpen}
        onToggleExplanation={() => onToggle(question.id)}
        onChoose={() => undefined}
        onText={() => undefined}
      />
      {isLast ? null : <AppButton label={t('practice.next')} variant="outline" onPress={() => onNext(index + 1)} />}
    </Card>
  );
});

const useStyles = createStyles((theme) => ({
  wrap: { flex: 1, gap: theme.spacing.md },
  flex: { flex: 1 },
  list: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  info: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
}));
