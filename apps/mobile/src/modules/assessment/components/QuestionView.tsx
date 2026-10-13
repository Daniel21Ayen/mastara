// apps/mobile/src/modules/assessment/components/QuestionView.tsx
import type { Question } from '@mastara/contracts';
import type { Answer, ContentLang } from '@mastara/domain';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText, RichText, TextField } from '@/shared/ui';

import { FeedbackPanel } from './FeedbackPanel';
import { OptionButton } from './OptionButton';
import type { OptionState } from './OptionButton';

interface QuestionViewProps {
  question: Question;
  lang: ContentLang;
  answer: Answer | undefined;
  checked: boolean;
  correct: boolean | undefined;
  onChoose: (optionId: string) => void;
  onText: (text: string) => void;
}

/** One question: prompt, the right input for its type, and feedback once checked. */
export function QuestionView({ question, lang, answer, checked, correct, onChoose, onText }: QuestionViewProps) {
  const { t } = useI18n();
  const chosen = answer?.kind === 'choice' ? answer.optionIds : [];

  let correctAnswer: string | undefined;
  const resolveBilingual = (val: any) =>
    typeof val === 'string' ? val : (val?.[lang] ?? val?.en ?? '');

  if (question.type === 'SHORT') {
    correctAnswer = question.acceptedAnswers[0];
  } else {
    correctAnswer = question.options
      .filter((option) => question.correctOptionIds.includes(option.id))
      .map((option) => resolveBilingual(option.label))
      .join(', ');
  }

  function stateOf(optionId: string): OptionState {
    if (question.type === 'SHORT') return 'idle';
    const picked = chosen.includes(optionId);
    if (!checked) return picked ? 'selected' : 'idle';
    if (question.correctOptionIds.includes(optionId)) return 'correct';
    return picked ? 'wrong' : 'idle';
  }

  return (
    <View style={styles.wrap}>
      <RichText text={resolveBilingual(question.prompt)} lang={lang} />

      {question.type === 'MULTIPLE' ? (
        <AppText variant="caption" muted>
          {t('practice.selectMany')}
        </AppText>
      ) : null}

      {question.type === 'SHORT' ? (
        <TextField
          label={t('practice.typeAnswer')}
          value={answer?.kind === 'text' ? answer.text : ''}
          onChangeText={onText}
          autoCapitalize="none"
        />
      ) : (
        question.options.map((option) => {
          const state = stateOf(option.id);
          return (
            <OptionButton
              key={option.id}
              label={resolveBilingual(option.label)}
              lang={lang}
              state={state}
              multiple={question.type === 'MULTIPLE'}
              disabled={checked}
              stateLabel={
                state === 'correct' ? t('practice.correct') : state === 'wrong' ? t('practice.incorrect') : undefined
              }
              onPress={() => onChoose(option.id)}
            />
          );
        })
      )}

      {checked && correct !== undefined ? (
        <FeedbackPanel
          correct={correct}
          lang={lang}
          correctAnswer={correctAnswer}
          explanation={question.explanation ? resolveBilingual(question.explanation) : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
});
