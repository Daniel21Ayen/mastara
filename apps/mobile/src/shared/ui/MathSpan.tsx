// apps/mobile/src/shared/ui/MathSpan.tsx
import { latexToUnicode } from '@mastara/domain';
import { Platform, Text, View } from 'react-native';

import { createStyles } from '@/core/theme';

interface MathSpanProps {
  latex: string;
  /** Block formula on its own line, or inline inside a sentence. */
  display: boolean;
}

/**
 * Draws a SIMPLE formula (Greek letters, small scripts, symbols) as native Unicode text: instant and no extra memory.
 * Formulas that need real layout (fractions, roots, matrices, limits) are drawn by KatexParagraph;
 * `needsLayout` in @mastara/domain decides, and RichText routes each paragraph.
 */
export function MathSpan({ latex, display }: MathSpanProps) {
  const styles = useStyles();
  const text = latexToUnicode(latex);

  if (!display) return <Text style={styles.inline}>{text}</Text>;

  return (
    <View style={styles.block} accessibilityLabel={text}>
      <Text style={styles.display}>{text}</Text>
    </View>
  );
}

const serif = Platform.select({ ios: 'Times New Roman', default: 'serif' });

const useStyles = createStyles((theme) => ({
  inline: { fontFamily: serif, color: theme.colors.text },
  block: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  display: { fontFamily: serif, fontSize: theme.fontSize.heading, color: theme.colors.text, textAlign: 'center' },
}));
