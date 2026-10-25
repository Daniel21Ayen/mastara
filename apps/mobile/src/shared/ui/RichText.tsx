// apps/mobile/src/shared/ui/RichText.tsx
import { latexToUnicode, needsLayout, parseMath } from '@mastara/domain';
import type { ContentLang, MathSegment } from '@mastara/domain';
import { useMemo } from 'react';
import { View } from 'react-native';

import { createStyles } from '@/core/theme';

import { AppText } from './AppText';
import { MathSpan } from './MathSpan';
import { SharedKatexRenderer } from './SharedKatexRenderer';

interface RichTextProps {
  /** Paragraphs separated by a blank line; math written as $inline$ or $$block$$. */
  text: string;
  lang: ContentLang;
}

export function RichText({ text, lang }: RichTextProps) {
  const styles = useStyles();

  // Parsed once per text
  const paragraphs = useMemo(
    () =>
      text
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.trim().length > 0)
        .map((paragraph) => {
          const segments = parseMath(paragraph.trim());
          const first = segments[0];
          const onlyBlock = segments.length === 1 && first?.kind === 'math' && first.display;
          const layoutHeavy = segments.some((segment) => segment.kind === 'math' && needsLayout(segment.value));
          return { segments, onlyBlock, layoutHeavy };
        }),
    [text],
  );

  const hasAnyLayoutHeavy = paragraphs.some((p) => p.layoutHeavy);

  // If any formula needs layout (fractions, roots, matrices), use the single shared renderer
  // instead of spawning multiple WebViews, staying strictly within the 120 MB RAM target.
  if (hasAnyLayoutHeavy) {
    const fullAccessibilityLabel = paragraphs.map((p) => spokenText(p.segments)).join(' ');
    return (
      <View style={styles.wrap}>
        <SharedKatexRenderer
          paragraphs={paragraphs}
          lang={lang}
          accessibilityLabel={fullAccessibilityLabel}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {paragraphs.map(({ segments, onlyBlock }, index) => {
        const first = segments[0];

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
}));
