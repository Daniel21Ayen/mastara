// apps/mobile/src/core/math/katexDocument.ts
import { KATEX_CSS } from './katexAssets.generated';

export interface MathDocumentStyle {
  /** CSS colour for text and formulas (from the theme; no colour is typed here). */
  color: string;
  fontSizePx: number;
  lineHeightPx: number;
  /** Font stack for the text around formulas. Web views cannot use the app's loaded fonts. */
  fontFamily: string;
  align: 'left' | 'center';
}

/**
 * Tells the app how tall the content is, once fonts are ready and whenever the size changes.
 * KaTeX paints fractions and roots outside their parent box, so the height is the lowest painted descendant,
 * not the container's own box (measuring the container clipped the denominator of a display fraction).
 */
const MEASURE_SCRIPT = `
(function () {
  var last = 0;
  function contentBottom() {
    var box = document.getElementById('m');
    var bottom = box.getBoundingClientRect().bottom;
    var all = box.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var b = all[i].getBoundingClientRect().bottom;
      if (b > bottom) bottom = b;
    }
    return Math.ceil(bottom + 2);
  }
  function post() {
    if (!window.ReactNativeWebView) return;
    var h = contentBottom();
    if (h > 0 && h !== last) { last = h; window.ReactNativeWebView.postMessage(String(h)); }
  }
  window.addEventListener('load', post);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(post);
  if (window.ResizeObserver) new ResizeObserver(post).observe(document.getElementById('m'));
  post();
})();`;

/**
 * A complete offline page: KaTeX stylesheet (fonts embedded), the already-rendered paragraph and a height reporter.
 * The content-security policy blocks every network request, so nothing can load from outside the phone.
 */
export function buildMathDocument(bodyHtml: string, style: MathDocumentStyle): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'">
<style>${KATEX_CSS}</style>
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; -webkit-text-size-adjust: 100%; }
  #m {
    display: flow-root; /* keep the display-formula margins inside the box instead of collapsing out */
    color: ${style.color};
    font-family: ${style.fontFamily};
    font-size: ${style.fontSizePx}px;
    line-height: ${style.lineHeightPx}px;
    text-align: ${style.align};
    overflow-wrap: anywhere;
  }
  .katex { font-size: 1.08em; }
  .katex-display { margin: 0.35em 0; }
  .katex-display > .katex { white-space: nowrap; }
  .m-error { font-family: monospace; }
</style>
</head>
<body><div id="m">${bodyHtml}</div><script>${MEASURE_SCRIPT}</script></body>
</html>`;
}
