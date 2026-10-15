// packages/domain/src/math/mathLayout.ts
import { latexToUnicode } from './latexToUnicode';

/** Commands that need real two-dimensional layout (fractions, roots, matrices, accents, stacked text). */
const STRUCTURE =
  /\\(?:[dtc]?frac|sqrt|binom|begin|over|atop|underset|overset|overline|underline|overbrace|underbrace|vec|hat|widehat|bar|tilde|widetilde|dot|ddot|mathbb|mathcal|mathfrak|boxed|cancel|substack|stackrel)(?![a-zA-Z])/;

/** Big operators with limits (\sum_{i=1}^{n}, \lim_{h\to 0}) put text above and below the symbol. */
const LIMITS = /\\(?:sum|prod|int|oint|lim|bigcup|bigcap|max|min)\s*[_^]/;

/**
 * True when a formula cannot be drawn faithfully as one line of Unicode text and must go to the KaTeX renderer.
 * Simple formulas (`E = mc^2`, `\alpha + \beta`, `x_1`) stay as fast native text: no web view, no extra memory.
 */
export function needsLayout(latex: string): boolean {
  if (STRUCTURE.test(latex) || LIMITS.test(latex)) return true;

  // The Unicode converter leaves an unknown command as \name and an unmappable script as ^(...) or _(...).
  const plain = latexToUnicode(latex);
  return plain.includes('\\') || /[_^]\(/.test(plain);
}
