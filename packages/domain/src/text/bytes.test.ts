// packages/domain/src/text/bytes.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatBytes, utf8Bytes } from './bytes';

test('English letters take 1 byte, Amharic letters 3, an emoji 4', () => {
  assert.equal(utf8Bytes('abc'), 3);
  assert.equal(utf8Bytes('ሰላም'), 9);
  assert.equal(utf8Bytes('é'), 2);
  assert.equal(utf8Bytes('😀'), 4);
  assert.equal(utf8Bytes(''), 0);
});

test('the count matches what Node itself stores', () => {
  for (const sample of ['Derivative f(x) = x²', 'ማስታወሻ · Notes', 'mixed ሰላም 😀 end']) {
    assert.equal(utf8Bytes(sample), Buffer.byteLength(sample, 'utf8'), sample);
  }
});

test('sizes are short and readable', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(900), '900 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(1.4 * 1024 * 1024), '1.4 MB');
  assert.equal(formatBytes(25 * 1024 * 1024), '25 MB');
});
