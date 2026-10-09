// apps/mobile/src/modules/assessment/components/FeedbackPanel.tsx
import type { ContentLang } from '@mastara/domain';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';
import { AppText, Icon, RichText } from '@/shared/ui';

interface FeedbackPanelProps {
  correct: boolean;
  lang: ContentLang;
  /** Shown only after a wrong answer. */
  correctAnswer?: string;
  explanation?: string;
}

/** Immediate feedback under a question: icon and words (not just colour), the answer and a short reason. */
export function FeedbackPanel({ correct, lang, correctAnswer, explanation }: FeedbackPanelProps) {
  const { t } = useI18n();
  const tone = correct ? theme.colors.primary : theme.colors.danger;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.panel, { backgroundColor: correct ? theme.colors.primarySoft : theme.colors.dangerSoft }]}
    >
      <View style={styles.title}>
        <Icon name={correct ? 'check' : 'close'} color={tone} size={22} />
        <AppText bold color={tone} variant="bodyLarge">
          {correct ? t('practice.correct') : t('practice.incorrect')}
        </AppText>
      </View>
      {!correct && correctAnswer ? <AppText bold>{t('practice.correctAnswer', { answer: correctAnswer })}</AppText> : null}
      {explanation ? <RichText text={explanation} lang={lang} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  title: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
});
