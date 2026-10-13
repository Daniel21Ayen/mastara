// apps/mobile/src/modules/quizzes/components/PracticeQuestionItem.tsx
import type { Question } from '@mastara/contracts';
import type { Answer, ContentLang } from '@mastara/domain';
import { memo } from 'react';

import { useI18n } from '@/core/i18n';
import { QuestionView } from '@/modules/assessment';
import { AppButton, AppText, Card } from '@/shared/ui';

interface PracticeQuestionItemProps {
  question: Question;
  number: number;
  total: number;
  /** Zero-based position, given back to `onNext`. */
  index: number;
  isLast: boolean;
  lang: ContentLang;
  answer: Answer | undefined;
  checked: boolean;
  correct: boolean | undefined;
  onChoose: (question: Question, optionId: string) => void;
  onText: (question: Question, text: string) => void;
  onCheck: (question: Question) => void;
  onNext: (index: number) => void;
  onFinish: () => void;
}

/** One question in the scrolling quiz: answer, instant feedback, then Next (or Finish on the last one). */
export const PracticeQuestionItem = memo(function PracticeQuestionItem({
  question,
  number,
  total,
  index,
  isLast,
  lang,
  answer,
  checked,
  correct,
  onChoose,
  onText,
  onCheck,
  onNext,
  onFinish,
}: PracticeQuestionItemProps) {
  const { t } = useI18n();

  const needsCheck = question.type === 'MULTIPLE' || question.type === 'SHORT';
  const canCheck =
    answer !== undefined && (answer.kind === 'text' ? answer.text.trim().length > 0 : answer.optionIds.length > 0);

  return (
    <Card>
      <AppText variant="caption" muted accessibilityRole="header">
        {t('practice.progress', { current: number, total })}
      </AppText>
      <QuestionView
        question={question}
        lang={lang}
        answer={answer}
        checked={checked}
        correct={correct}
        onChoose={(optionId) => onChoose(question, optionId)}
        onText={(text) => onText(question, text)}
      />
      {needsCheck && !checked ? (
        <AppButton label={t('practice.check')} disabled={!canCheck} onPress={() => onCheck(question)} />
      ) : null}
      {isLast ? (
        <AppButton label={t('practice.finish')} onPress={onFinish} />
      ) : (
        <AppButton label={t('practice.next')} variant="outline" onPress={() => onNext(index + 1)} />
      )}
    </Card>
  );
});
