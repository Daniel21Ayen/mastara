// apps/mobile/src/shared/ui/SharedKatexRenderer.tsx
import type { ContentLang, MathSegment } from '@mastara/domain';
import { memo, useMemo, useState } from 'react';
import { PixelRatio, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import {
  buildMathDocument,
  getCachedChapterMarkup,
  renderParagraphHtml,
  setCachedChapterMarkup,
} from '@/core/math';
import { createStyles, useTheme } from '@/core/theme';

export interface ParagraphItem {
  segments: readonly MathSegment[];
  onlyBlock: boolean;
}

interface SharedKatexRendererProps {
  paragraphs: readonly ParagraphItem[];
  lang: ContentLang;
  accessibilityLabel: string;
}

/** Cache heights of rendered documents by composite key to prevent jumping during scroll. */
const docHeightCache = new Map<string, number>();
const CACHE_LIMIT = 200;

function rememberHeight(key: string, height: number): void {
  if (docHeightCache.size >= CACHE_LIMIT) {
    const oldest = docHeightCache.keys().next().value;
    if (oldest !== undefined) docHeightCache.delete(oldest);
  }
  docHeightCache.set(key, height);
}

const FONT_STACK: Record<ContentLang, string> = {
  en: "system-ui, 'Roboto', 'Helvetica Neue', sans-serif",
  am: "'Noto Sans Ethiopic', 'Abyssinica SIL', system-ui, sans-serif",
};

/**
 * Single Shared KaTeX Renderer: renders all math-heavy paragraphs of a document
 * inside a SINGLE WebView instance rather than spawning N WebViews per formula.
 * Drastically reduces memory consumption on 2 GB Android devices to meet the < 120 MB RAM target.
 */
export const SharedKatexRenderer = memo(function SharedKatexRenderer({
  paragraphs,
  lang,
  accessibilityLabel,
}: SharedKatexRendererProps) {
  const theme = useTheme();
  const styles = useStyles();
  const fontScale = PixelRatio.getFontScale();
  const fontSizePx = Math.round(theme.fontSize.bodyLarge * fontScale);
  const lineHeightPx = Math.round(26 * fontScale);

  const cacheKey = useMemo(
    () => JSON.stringify([paragraphs, lang, fontScale]),
    [paragraphs, lang, fontScale],
  );

  const html = useMemo(() => {
    const cached = getCachedChapterMarkup(cacheKey);
    if (cached) return cached;

    const bodyContent = paragraphs
      .map((item) => {
        const innerHtml = renderParagraphHtml(item.segments);
        if (item.onlyBlock) {
          return `<div style="text-align:center; background-color: rgba(26,86,219,0.08); border-radius: 8px; padding: 12px; margin: 8px 0;">${innerHtml}</div>`;
        }
        return `<p style="margin: 0 0 12px 0; text-align: left;">${innerHtml}</p>`;
      })
      .join('');

    const documentHtml = buildMathDocument(bodyContent, {
      color: theme.colors.text,
      fontSizePx,
      lineHeightPx,
      fontFamily: FONT_STACK[lang],
      align: 'left',
    });

    setCachedChapterMarkup(cacheKey, documentHtml);
    return documentHtml;
  }, [cacheKey, paragraphs, lang, fontSizePx, lineHeightPx, theme.colors.text]);

  const initialHeight = useMemo(() => {
    const cached = docHeightCache.get(cacheKey);
    if (cached) return cached;
    const estimated = paragraphs.reduce((acc, p) => {
      const segLen = p.segments.reduce((s, seg) => s + seg.value.length, 0);
      const lines = Math.max(1, Math.ceil(segLen / 45));
      return acc + (p.onlyBlock ? lineHeightPx * 3.5 : lines * lineHeightPx) + 12;
    }, 24);
    return Math.max(lineHeightPx * 2, Math.round(estimated));
  }, [cacheKey, paragraphs, lineHeightPx]);

  const [height, setHeight] = useState(initialHeight);

  function onMessage(event: WebViewMessageEvent) {
    const measured = Number(event.nativeEvent.data);
    if (!Number.isFinite(measured) || measured <= 0) return;
    rememberHeight(cacheKey, measured);
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
          androidLayerType="hardware"
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

const useStyles = createStyles(() => ({
  wrap: { alignSelf: 'stretch' },
  web: { backgroundColor: 'transparent' },
}));
