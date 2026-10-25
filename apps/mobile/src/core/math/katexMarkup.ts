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

const formulaCache = new Map<string, string>();
const MAX_FORMULA_CACHE = 500;

export function clearFormulaCache(): void {
  formulaCache.clear();
}

export function getFormulaCacheSize(): number {
  return formulaCache.size;
}


/** One formula to HTML with in-memory caching for instant first paint and re-renders. */
export function renderFormula(latex: string, display: boolean): string {
  const key = `${display ? 'D' : 'I'}:${latex}`;
  const cached = formulaCache.get(key);
  if (cached !== undefined) return cached;

  let markup: string;
  try {
    markup = renderToString(latex, {
      displayMode: display,
      output: 'html', // no MathML copy: smaller markup, and screen readers use the native label instead
      throwOnError: false,
      strict: 'ignore',
      trust: false, // no \href, \url, \includegraphics from admin-written content
      maxExpand: 1000,
    });
  } catch {
    markup = `<span class="m-error">${escapeHtml(latex)}</span>`;
  }

  if (formulaCache.size >= MAX_FORMULA_CACHE) {
    const oldest = formulaCache.keys().next().value;
    if (oldest !== undefined) formulaCache.delete(oldest);
  }
  formulaCache.set(key, markup);
  return markup;
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
