// apps/mobile/src/modules/exams/components/ExamQuestionItem.tsx
import type { Question } from '@mastara/contracts';
import type { Answer, ContentLang } from '@mastara/domain';
import { memo } from 'react';
import { Pressable } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { QuestionView } from '@/modules/assessment';
import { AppButton, AppText, Card, Icon } from '@/shared/ui';

interface ExamQuestionItemProps {
  question: Question;
  number: number;
  total: number;
  /** Zero-based position, given back to `onNext`. */
  index: number;
  isLast: boolean;
  lang: ContentLang;
  answer: Answer | undefined;
  flagged: boolean;
  onChoose: (question: Question, optionId: string) => void;
  onText: (question: Question, text: string) => void;
  onFlag: (questionId: string) => void;
  /** The Next button under the question: moves to the question after `index`. Scrolling does the same. */
  onNext: (index: number) => void;
}

/** One question in the scrolling exam list. Re-renders only when its own answer or flag changes. */
export const ExamQuestionItem = memo(function ExamQuestionItem({
  question,
  number,
  total,
  index,
  isLast,
  lang,
  answer,
  flagged,
  onChoose,
  onText,
  onFlag,
  onNext,
}: ExamQuestionItemProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const flagColour = flagged ? theme.colors.danger : theme.colors.textMuted;

  return (
    <Card>
      <AppText variant="caption" muted accessibilityRole="header">
        {t('practice.progress', { current: number, total })}
      </AppText>
      <QuestionView
        question={question}
        lang={lang}
        answer={answer}
        checked={false}
        correct={undefined}
        onChoose={(optionId) => onChoose(question, optionId)}
        onText={(text) => onText(question, text)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: flagged }}
        onPress={() => onFlag(question.id)}
        style={styles.flag}
      >
        <Icon name="flag" color={flagColour} />
        <AppText bold color={flagColour}>
          {flagged ? t('exam.flagged') : t('exam.flag')}
        </AppText>
      </Pressable>
      {/* The last question has Submit under the list instead. */}
      {isLast ? null : <AppButton label={t('practice.next')} variant="outline" onPress={() => onNext(index + 1)} />}
    </Card>
  );
});

const useStyles = createStyles((theme) => ({
  flag: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.minTouchTarget },
}));
