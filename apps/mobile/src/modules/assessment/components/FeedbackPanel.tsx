// apps/mobile/src/modules/assessment/components/FeedbackPanel.tsx
import type { ContentLang } from '@mastara/domain';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/core/i18n';
import { createStyles, useTheme } from '@/core/theme';
import { AppText, Icon, RichText } from '@/shared/ui';

interface FeedbackPanelProps {
  correct: boolean;
  lang: ContentLang;
  /** Shown only after a wrong answer. */
  correctAnswer?: string;
  explanation?: string;
  /** Review only: the question was left blank. Shows the answer and the reason without marking it wrong. */
  skipped?: boolean;
  /**
   * The explanation is hidden until the student taps Show. Pass `expanded` and `onToggleExplanation` to keep the choice
   * outside (a long scrolling list); leave both out and the panel remembers it itself.
   */
  expanded?: boolean;
  onToggleExplanation?: () => void;
}

/** Immediate feedback under a question: icon and words (not just colour), the answer and a short reason. */
export function FeedbackPanel({
  correct,
  lang,
  correctAnswer,
  explanation,
  skipped = false,
  expanded,
  onToggleExplanation,
}: FeedbackPanelProps) {
  const theme = useTheme();
  const styles = useStyles();
  const { t } = useI18n();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = expanded ?? ownOpen;
  const toggle = onToggleExplanation ?? (() => setOwnOpen((value) => !value));
  const tone = skipped ? theme.colors.text : correct ? theme.accents.emerald.main : theme.colors.danger;
  const background = skipped ? theme.colors.background : correct ? theme.accents.emerald.soft : theme.colors.dangerSoft;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.panel, { backgroundColor: background }]}
    >
      <View style={styles.title}>
        <Icon name={correct ? 'check' : 'close'} color={tone} size={22} />
        <AppText bold color={tone} variant="bodyLarge">
          {skipped ? t('review.skipped') : correct ? t('practice.correct') : t('practice.incorrect')}
        </AppText>
      </View>
      {(skipped || !correct) && correctAnswer ? <AppText bold>{t('practice.correctAnswer', { answer: correctAnswer })}</AppText> : null}
      {explanation ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={toggle}
            style={styles.toggle}
          >
            <AppText bold color={theme.colors.primary}>
              {open ? t('review.hideExplanation') : t('review.showExplanation')}
            </AppText>
            <View style={open ? styles.up : styles.down}>
              <Icon name="chevron" color={theme.colors.primary} size={18} />
            </View>
          </Pressable>
          {open ? <RichText text={explanation} lang={lang} /> : null}
        </>
      ) : null}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  panel: { borderRadius: theme.radius.md, padding: theme.spacing.md, gap: theme.spacing.sm },
  title: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, minHeight: theme.minTouchTarget },
  down: { transform: [{ rotate: '90deg' }] },
  up: { transform: [{ rotate: '-90deg' }] },
}));
