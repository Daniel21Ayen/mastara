// packages/domain/src/math/mathLayout.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { needsLayout } from './mathLayout';
import { parseMath } from './parseMath';

test('simple formulas stay as native text', () => {
  for (const latex of ['E = mc^2', '\\alpha + \\beta', 'x_1^2', 'a^{n+1}', 'x \\le 5', '\\pi r^2']) {
    assert.equal(needsLayout(latex), false, latex);
  }
});

test('fractions, roots, matrices and limits need layout', () => {
  const complex = [
    '\\frac{a}{b}',
    '\\sqrt{2}',
    '\\sqrt[3]{x}',
    'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}',
    "f'(x)=\\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}",
    '\\sum_{i=1}^{n} i',
    '\\int_0^1 x\\,dx',
    '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    '\\vec{v}',
  ];
  for (const latex of complex) assert.equal(needsLayout(latex), true, latex);
});

test('a script the Unicode converter cannot map goes to layout', () => {
  assert.equal(needsLayout('x^{k}'), true); // no superscript k in Unicode
  assert.equal(needsLayout('\\unknowncommand'), true);
});

test('\\over is a layout command but \\overline is matched on its own', () => {
  assert.equal(needsLayout('a \\over b'), true);
  assert.equal(needsLayout('\\overline{AB}'), true);
});

test('parseMath keeps text and formulas apart', () => {
  const segments = parseMath('Speed is $v = d/t$ and $$\\frac{a}{b}$$ done, cost \\$5.');
  assert.deepEqual(
    segments.map((s) => s.kind),
    ['text', 'math', 'text', 'math', 'text'],
  );
  assert.equal(segments[4]?.kind === 'text' && segments[4].value.includes('$5'), true);
});
