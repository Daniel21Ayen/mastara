// apps/mobile/src/modules/assessment/components/OptionButton.tsx
import type { ContentLang } from '@mastara/domain';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/core/theme';
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
  const feedback = state === 'correct' ? 'check' : state === 'wrong' ? 'close' : null;

  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: state === 'selected' || state === 'correct', disabled }}
      accessibilityLabel={stateLabel ? `${label}, ${stateLabel}` : label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, rowStyle[state]]}
    >
      <View style={[styles.marker, multiple ? styles.square : styles.round, markerStyle[state]]}>
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

const styles = StyleSheet.create({
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
});

const rowStyle = StyleSheet.create({
  idle: { backgroundColor: theme.colors.surface, borderColor: theme.colors.surface },
  selected: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  correct: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  wrong: { backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger },
});

const markerStyle = StyleSheet.create({
  idle: { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  selected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
  correct: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  wrong: { borderColor: theme.colors.danger, backgroundColor: theme.colors.danger },
});
