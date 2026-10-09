// apps/mobile/src/shared/ui/MathSpan.tsx
import { latexToUnicode } from '@mastara/domain';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/core/theme';

interface MathSpanProps {
  latex: string;
  /** Block formula on its own line, or inline inside a sentence. */
  display: boolean;
}

/**
 * The single place that draws a formula. Today it converts common LaTeX to Unicode (fully offline).
 * The KaTeX renderer replaces only this file.
 */
export function MathSpan({ latex, display }: MathSpanProps) {
  const text = latexToUnicode(latex);

  if (!display) return <Text style={styles.inline}>{text}</Text>;

  return (
    <View style={styles.block} accessibilityLabel={text}>
      <Text style={styles.display}>{text}</Text>
    </View>
  );
}

const serif = Platform.select({ ios: 'Times New Roman', default: 'serif' });

const styles = StyleSheet.create({
  inline: { fontFamily: serif, color: theme.colors.text },
  block: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  display: { fontFamily: serif, fontSize: theme.fontSize.heading, color: theme.colors.text, textAlign: 'center' },
});
