// packages/ui-tokens/src/themes.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACCENT_NAMES, getAccents } from './accents';
import { getColors } from './colors';
import type { ColorScheme } from './colors';

/** Parses #rrggbb or rgba(r, g, b, a). */
function parse(colour: string): { r: number; g: number; b: number; a: number } {
  if (colour.startsWith('#')) {
    return { r: parseInt(colour.slice(1, 3), 16), g: parseInt(colour.slice(3, 5), 16), b: parseInt(colour.slice(5, 7), 16), a: 1 };
  }
  const [r, g, b, a] = (/rgba\(([^)]+)\)/.exec(colour)?.[1] ?? '').split(',').map(Number);
  return { r: r as number, g: g as number, b: b as number, a: a ?? 1 };
}

/** Composites `top` over an opaque `bottom`. */
function over(top: string, bottom: string): string {
  const t = parse(top);
  const b = parse(bottom);
  const mix = (x: number, y: number) => Math.round(x * t.a + y * (1 - t.a));
  return `#${[mix(t.r, b.r), mix(t.g, b.g), mix(t.b, b.b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const { r, g, b } = parse(hex);
  const lin = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (lin[0] as number) + 0.7152 * (lin[1] as number) + 0.0722 * (lin[2] as number);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const SCHEMES: ColorScheme[] = ['light', 'dark'];

for (const scheme of SCHEMES) {
  const c = getColors(scheme);
  // The page is `background` over a base: white (light) or the page colour itself (dark).
  const page = over(c.background, scheme === 'light' ? '#ffffff' : '#0b1220');

  test(`${scheme}: body text is readable on the card and on the page (4.5:1)`, () => {
    assert.ok(contrast(c.text, c.surface) >= 4.5, `text/surface ${contrast(c.text, c.surface).toFixed(2)}`);
    assert.ok(contrast(c.text, page) >= 4.5, `text/page ${contrast(c.text, page).toFixed(2)}`);
  });

  test(`${scheme}: muted text is readable on the card and on the page (4.5:1)`, () => {
    const muted = (bg: string) => contrast(over(c.textMuted, bg), bg);
    assert.ok(muted(c.surface) >= 4.5, `muted/surface ${muted(c.surface).toFixed(2)}`);
    assert.ok(muted(page) >= 4.5, `muted/page ${muted(page).toFixed(2)}`);
  });

  test(`${scheme}: links and error text are readable on card, page and tinted backgrounds (4.5:1)`, () => {
    for (const [name, colour] of [['primary', c.primary], ['danger', c.danger]] as const) {
      assert.ok(contrast(colour, c.surface) >= 4.5, `${name}/surface ${contrast(colour, c.surface).toFixed(2)}`);
      assert.ok(contrast(colour, page) >= 4.5, `${name}/page ${contrast(colour, page).toFixed(2)}`);
    }
    const primarySoft = over(c.primarySoft, c.surface);
    assert.ok(contrast(c.primary, primarySoft) >= 4.5, `primary/primarySoft ${contrast(c.primary, primarySoft).toFixed(2)}`);
    const dangerSoft = over(c.dangerSoft, c.surface);
    assert.ok(contrast(c.danger, dangerSoft) >= 4.5, `danger/dangerSoft ${contrast(c.danger, dangerSoft).toFixed(2)}`);
  });

  test(`${scheme}: text on a primary button is readable (4.5:1)`, () => {
    assert.ok(contrast(c.onPrimary, c.primary) >= 4.5, `onPrimary/primary ${contrast(c.onPrimary, c.primary).toFixed(2)}`);
  });

  test(`${scheme}: icons and letters on a solid accent tile are readable (3:1), text on the fuchsia banner (4.5:1 not required for large text)`, () => {
    const accents = getAccents(scheme);
    for (const name of [...ACCENT_NAMES, 'danger'] as const) {
      const ratio = contrast(c.onPrimary, accents[name].main);
      assert.ok(ratio >= 3, `${name} ${ratio.toFixed(2)}`);
    }
  });

  test(`${scheme}: accent icons on their own tinted tile are readable (3:1)`, () => {
    const accents = getAccents(scheme);
    for (const name of [...ACCENT_NAMES, 'danger'] as const) {
      const tile = over(accents[name].soft, c.surface);
      const ratio = contrast(accents[name].main, tile);
      assert.ok(ratio >= 3, `${name} on its tile ${ratio.toFixed(2)}`);
    }
  });
}

test('both schemes define every colour name', () => {
  assert.deepEqual(Object.keys(getColors('light')).sort(), Object.keys(getColors('dark')).sort());
  assert.deepEqual(Object.keys(getAccents('light')).sort(), Object.keys(getAccents('dark')).sort());
});
