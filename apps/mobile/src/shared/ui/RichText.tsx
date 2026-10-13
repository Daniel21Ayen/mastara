// apps/mobile/src/shared/ui/RichText.tsx
import { latexToUnicode, needsLayout, parseMath } from '@mastara/domain';
import type { ContentLang, MathSegment } from '@mastara/domain';
import { useMemo } from 'react';
import { View } from 'react-native';

import { createStyles } from '@/core/theme';

import { AppText } from './AppText';
import { KatexParagraph } from './KatexParagraph';
import { MathSpan } from './MathSpan';

interface RichTextProps {
  /** Paragraphs separated by a blank line; math written as $inline$ or $$block$$. */
  text: string;
  lang: ContentLang;
}

export function RichText({ text, lang }: RichTextProps) {
  const styles = useStyles();
  // Parsed once per text, so a formula paragraph keeps the same `segments` and its page is not rebuilt.
  const paragraphs = useMemo(
    () =>
      text
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.trim().length > 0)
        .map((paragraph) => parseMath(paragraph.trim())),
    [text],
  );

  return (
    <View style={styles.wrap}>
      {paragraphs.map((segments, index) => {
        const first = segments[0];
        const onlyBlock = segments.length === 1 && first?.kind === 'math' && first.display;

        // Fractions, roots, matrices and limits need real layout: the whole paragraph goes to KaTeX.
        // Simple formulas (E = mc^2, Greek letters, small scripts) stay as fast native text below.
        if (segments.some((segment) => segment.kind === 'math' && needsLayout(segment.value))) {
          const paragraphView = (
            <KatexParagraph
              segments={segments}
              lang={lang}
              align={onlyBlock ? 'center' : 'left'}
              accessibilityLabel={spokenText(segments)}
            />
          );
          return onlyBlock ? (
            <View key={index} style={styles.block}>
              {paragraphView}
            </View>
          ) : (
            <View key={index}>{paragraphView}</View>
          );
        }

        // A paragraph that is only a simple block formula is drawn as its own block.
        if (onlyBlock && first?.kind === 'math') {
          return <MathSpan key={index} latex={first.value} display />;
        }

        return (
          <AppText key={index} variant="bodyLarge" lang={lang} style={styles.paragraph}>
            {segments.map((segment, position) =>
              segment.kind === 'text' ? (
                segment.value
              ) : (
                <MathSpan key={position} latex={segment.value} display={false} />
              ),
            )}
          </AppText>
        );
      })}
    </View>
  );
}

/** What a screen reader says for a paragraph: text as written, formulas as Unicode. */
function spokenText(segments: readonly MathSegment[]): string {
  return segments.map((segment) => (segment.kind === 'text' ? segment.value : latexToUnicode(segment.value))).join('');
}

const useStyles = createStyles((theme) => ({
  wrap: { gap: theme.spacing.md },
  paragraph: { lineHeight: 26 },
  block: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
}));
