// apps/admin-web/src/modules/content/components/RichPreview.tsx
import { KaTeXRenderer } from '@/shared/math';
import type { ContentLang } from '@mastara/domain';

import styles from './RichPreview.module.css';

interface RichPreviewProps {
  text: string;
  lang?: ContentLang;
  /** Shown when the text is empty. */
  empty: string;
}

/**
 * Text with $...$ and $$...$$ formulas rendered accurately with KaTeX.
 */
export function RichPreview({ text, lang = 'en', empty }: RichPreviewProps) {
  if (!text || !text.trim()) return <p className={styles.empty}>{empty}</p>;
  return (
    <div className={styles.preview} lang={lang}>
      <KaTeXRenderer text={text} emptyFallback={<p className={styles.empty}>{empty}</p>} />
    </div>
  );
}
