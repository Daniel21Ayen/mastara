// apps/mobile/src/modules/assessment/components/OptionButton.tsx
import type { ContentLang } from '@mastara/domain';
import { Pressable, View } from 'react-native';

import { createStyles, useTheme } from '@/core/theme';
import { Icon, RichText } from '@/shared/ui';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';

interface OptionButtonProps {
  label: string;
  lang: ContentLang;
  state: OptionState;
  /** Square tick box for "select all" questions, round marker for single choice. */
  multiple: boolean;
  disabled: boolean;
  /** Spoken state, so colour is never the only signal. */
  stateLabel?: string;
  onPress: () => void;
}

export function OptionButton({ label, lang, state, multiple, disabled, stateLabel, onPress }: OptionButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const feedback = state === 'correct' ? 'check' : state === 'wrong' ? 'close' : null;

  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: state === 'selected' || state === 'correct', disabled }}
      accessibilityLabel={stateLabel ? `${label}, ${stateLabel}` : label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, styles[ROW[state]]]}
    >
      <View style={[styles.marker, multiple ? styles.square : styles.round, styles[MARKER[state]]]}>
        {feedback ? (
          <Icon name={feedback} size={16} color={theme.colors.onPrimary} />
        ) : state === 'selected' ? (
          <View style={styles.dot} />
        ) : null}
      </View>
      <View style={styles.label}>
        <RichText text={label} lang={lang} />
      </View>
    </Pressable>
  );
}

const ROW = { idle: 'rowIdle', selected: 'rowSelected', correct: 'rowCorrect', wrong: 'rowWrong' } as const;
const MARKER = { idle: 'markerIdle', selected: 'markerSelected', correct: 'markerCorrect', wrong: 'markerWrong' } as const;

const useStyles = createStyles((theme) => ({
  row: {
    minHeight: theme.minTouchTarget + theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  marker: { width: 26, height: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  round: { borderRadius: theme.radius.pill },
  square: { borderRadius: theme.radius.sm },
  dot: { width: 10, height: 10, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary },
  label: { flex: 1 },

  // An unselected option keeps a visible edge, so it stands out from its card in light and dark.
  rowIdle: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  rowSelected: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  rowCorrect: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  rowWrong: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },

  markerIdle: { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  markerSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
  markerCorrect: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  markerWrong: { borderColor: theme.colors.danger, backgroundColor: theme.colors.danger },
}));
