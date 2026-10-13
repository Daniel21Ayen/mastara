// apps/mobile/src/core/math/katexMarkup.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseMath } from '@mastara/domain';

import { buildMathDocument } from './katexDocument';
import { escapeHtml, renderFormula, renderParagraphHtml } from './katexMarkup';

test('a fraction renders to KaTeX markup', () => {
  const html = renderFormula('\\frac{a}{b}', false);
  assert.match(html, /class="katex"/);
  assert.match(html, /mfrac/);
  assert.doesNotMatch(html, /<math/); // html output only
});

test('a square root and a matrix render', () => {
  assert.match(renderFormula('\\sqrt{x^2+1}', false), /sqrt/);
  assert.match(renderFormula('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', true), /katex-display/);
});

test('invalid LaTeX never throws', () => {
  assert.doesNotThrow(() => renderFormula('\\frac{a', false));
  assert.doesNotThrow(() => renderFormula('\\notacommand{x}', false));
});

test('trust is off: links and images are not produced', () => {
  const html = renderFormula('\\href{https://evil.example}{click}', false);
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /evil\.example"/);
});

test('text around formulas is escaped', () => {
  const html = renderParagraphHtml(parseMath('Use <b>bold</b> & $\\frac{1}{2}$\nnext'));
  assert.match(html, /&lt;b&gt;bold&lt;\/b&gt; &amp; /);
  assert.match(html, /<br>next/);
  assert.equal(escapeHtml(`"'`), '&quot;&#39;');
});

test('the page is offline: no external URLs, fonts are embedded, network is blocked by policy', () => {
  const page = buildMathDocument(renderParagraphHtml(parseMath('$\\frac{a}{b}$')), {
    color: 'rgb(15, 27, 51)',
    fontSizePx: 17,
    lineHeightPx: 26,
    fontFamily: 'sans-serif',
    align: 'left',
  });
  assert.match(page, /default-src 'none'/);
  assert.doesNotMatch(page, /src="http|href="http|url\(http|url\(fonts\//);
  assert.match(page, /data:font\/woff2;base64,/);
});
