// apps/mobile/src/shared/ui/RichText.tsx
import { parseMath } from '@mastara/domain';
import type { ContentLang } from '@mastara/domain';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/core/theme';

import { AppText } from './AppText';
import { MathSpan } from './MathSpan';

interface RichTextProps {
  /** Paragraphs separated by a blank line; math written as $inline$ or $$block$$. */
  text: string;
  lang: ContentLang;
}

export function RichText({ text, lang }: RichTextProps) {
  const paragraphs = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0);

  return (
    <View style={styles.wrap}>
      {paragraphs.map((paragraph, index) => {
        const segments = parseMath(paragraph.trim());
        const first = segments[0];

        // A paragraph that is only a block formula is drawn as its own block.
        if (segments.length === 1 && first?.kind === 'math' && first.display) {
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

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.md },
  paragraph: { lineHeight: 26 },
});
