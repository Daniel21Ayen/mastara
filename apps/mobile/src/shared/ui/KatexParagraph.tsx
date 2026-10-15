// apps/mobile/src/shared/ui/KatexParagraph.tsx
import type { ContentLang, MathSegment } from '@mastara/domain';
import { memo, useMemo, useState } from 'react';
import { PixelRatio, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import { buildMathDocument, renderParagraphHtml } from '@/core/math';
import { createStyles, useTheme } from '@/core/theme';

interface KatexParagraphProps {
  segments: readonly MathSegment[];
  lang: ContentLang;
  align?: 'left' | 'center';
  /** What a screen reader says (formulas as Unicode text). The web view itself is hidden from it. */
  accessibilityLabel: string;
}

/** Heights already measured, so a paragraph that scrolls back into a list does not jump. */
const heightCache = new Map<string, number>();
const CACHE_LIMIT = 300;

function remember(key: string, height: number): void {
  if (heightCache.size >= CACHE_LIMIT) {
    const oldest = heightCache.keys().next().value;
    if (oldest !== undefined) heightCache.delete(oldest);
  }
  heightCache.set(key, height);
}

// A web view cannot use fonts loaded by expo-font. System fonts are used instead; Android and iOS both
// ship an Ethiopic font. Check Amharic text on a Tecno / Infinix phone (see docs/changes/PHASE-F4b-CHANGES.md).
const FONT_STACK: Record<ContentLang, string> = {
  en: "system-ui, 'Roboto', 'Helvetica Neue', sans-serif",
  am: "'Noto Sans Ethiopic', 'Abyssinica SIL', system-ui, sans-serif",
};

/**
 * A paragraph that contains a fraction, root, matrix or other formula that plain text cannot show.
 * The whole paragraph is drawn by KaTeX inside one offline web view so text and formulas flow together.
 * The web view ignores touches, so a parent button (an answer option) still receives the tap.
 */
export const KatexParagraph = memo(function KatexParagraph({
  segments,
  lang,
  align = 'left',
  accessibilityLabel,
}: KatexParagraphProps) {
  const theme = useTheme();
  const styles = useStyles();
  const fontScale = PixelRatio.getFontScale(); // follow the phone's font-size setting like native text does
  const fontSizePx = Math.round(theme.fontSize.bodyLarge * fontScale);
  const lineHeightPx = Math.round(26 * fontScale);

  const cacheKey = useMemo(() => JSON.stringify([segments, lang, align, fontScale]), [segments, lang, align, fontScale]);
  const html = useMemo(
    () =>
      buildMathDocument(renderParagraphHtml(segments), {
        color: theme.colors.text,
        fontSizePx,
        lineHeightPx,
        fontFamily: FONT_STACK[lang],
        align,
      }),
    [segments, lang, align, fontSizePx, lineHeightPx, theme.colors.text],
  );

  const [height, setHeight] = useState(() => heightCache.get(cacheKey) ?? lineHeightPx * 2);

  function onMessage(event: WebViewMessageEvent) {
    const measured = Number(event.nativeEvent.data);
    if (!Number.isFinite(measured) || measured <= 0) return;
    remember(cacheKey, measured);
    setHeight(measured);
  }

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel} style={styles.wrap}>
      <View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ height }}
      >
        <WebView
          source={{ html }}
          style={styles.web}
          onMessage={onMessage}
          // Everything is inside the page; refuse any navigation and any file access.
          onShouldStartLoadWithRequest={(request) => request.url.startsWith('about:')}
          originWhitelist={['about:*']}
          javaScriptEnabled
          domStorageEnabled={false}
          allowFileAccess={false}
          setSupportMultipleWindows={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          textZoom={100}
          automaticallyAdjustContentInsets={false}
        />
      </View>
    </View>
  );
});

const useStyles = createStyles((theme) => ({
  wrap: { alignSelf: 'stretch' },
  web: { backgroundColor: 'transparent' },
}));
