// apps/mobile/src/core/math/katexMarkup.ts
import type { MathSegment } from '@mastara/domain';
import { renderToString } from 'katex';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** One formula to HTML. A formula KaTeX cannot parse is shown as its source text, never as a crash. */
export function renderFormula(latex: string, display: boolean): string {
  try {
    return renderToString(latex, {
      displayMode: display,
      output: 'html', // no MathML copy: smaller markup, and screen readers use the native label instead
      throwOnError: false,
      strict: 'ignore',
      trust: false, // no \href, \url, \includegraphics from admin-written content
      maxExpand: 1000,
    });
  } catch {
    return `<span class="m-error">${escapeHtml(latex)}</span>`;
  }
}

/** A paragraph (text and formulas) to HTML. Text is escaped; a newline becomes a line break. */
export function renderParagraphHtml(segments: readonly MathSegment[]): string {
  return segments
    .map((segment) =>
      segment.kind === 'text'
        ? escapeHtml(segment.value).replace(/\n/g, '<br>')
        : renderFormula(segment.value, segment.display),
    )
    .join('');
}
