// packages/ui-tokens/src/accents.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ACCENT_NAMES, accentForKey, accents } from './accents';

test('the same key always gets the same accent', () => {
  assert.equal(accentForKey('course-1'), accentForKey('course-1'));
});

test('keys spread over all the accents', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i += 1) seen.add(accentForKey(`course-${i}`));
  assert.equal(seen.size, ACCENT_NAMES.length);
});

test('danger is never picked for decoration', () => {
  for (let i = 0; i < 200; i += 1) assert.notEqual(accentForKey(`k${i}`), 'danger');
});

test('every accent has a strong colour and lighter tints', () => {
  for (const name of [...ACCENT_NAMES, 'danger'] as const) {
    assert.match(accents[name].main, /^#[0-9a-f]{6}$/i);
    assert.match(accents[name].soft, /^rgba\(/);
    assert.match(accents[name].track, /^rgba\(/);
  }
});

test('white icons stay readable on every strong accent (contrast at least 3:1)', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * (c[0] as number) + 0.7152 * (c[1] as number) + 0.0722 * (c[2] as number);
  };
  for (const name of [...ACCENT_NAMES, 'danger'] as const) {
    const ratio = 1.05 / (lum(accents[name].main) + 0.05);
    assert.ok(ratio >= 3, `${name} contrast ${ratio.toFixed(2)}`);
  }
});
