// apps/admin-web/src/modules/content/components/RichPreview.tsx
import { latexToUnicode, parseMath } from '@mastara/domain';
import type { ContentLang } from '@mastara/domain';

import styles from './RichPreview.module.css';

interface RichPreviewProps {
  text: string;
  lang: ContentLang;
  /** Shown when the text is empty. */
  empty: string;
}

/**
 * Text with $...$ and $$...$$ formulas as the editor shows it. Formulas use plain Unicode here; the
 * student app draws them with KaTeX, which is the reference rendering.
 */
export function RichPreview({ text, lang, empty }: RichPreviewProps) {
  if (!text.trim()) return <p className={styles.empty}>{empty}</p>;
  return (
    <div className={styles.preview} lang={lang}>
      {parseMath(text).map((segment, index) =>
        segment.kind === 'text' ? (
          <span key={index}>{segment.value}</span>
        ) : segment.display ? (
          <span key={index} className={styles.block}>
            {latexToUnicode(segment.value)}
          </span>
        ) : (
          <span key={index} className={styles.inline}>
            {latexToUnicode(segment.value)}
          </span>
        ),
      )}
    </div>
  );
}
