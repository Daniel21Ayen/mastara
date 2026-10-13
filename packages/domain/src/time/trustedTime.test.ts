// packages/domain/src/time/trustedTime.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { trustedNowMs } from './trustedTime';

const DAY = 86_400_000;

test('date set back inside one boot: the uptime clock still shows the real time', () => {
  const saved = { wallMs: 10 * DAY, uptimeMs: 1 * DAY, bootId: '5' };
  const now = { wallMs: 8 * DAY, uptimeMs: 3 * DAY, bootId: '5' }; // two real days later, date set back
  assert.equal(trustedNowMs(10 * DAY, saved, now), 12 * DAY);
});

test('date set forward is respected (it can only shorten access)', () => {
  const saved = { wallMs: 10 * DAY, uptimeMs: 1 * DAY, bootId: '5' };
  const now = { wallMs: 20 * DAY, uptimeMs: 1 * DAY + 1000, bootId: '5' };
  assert.equal(trustedNowMs(10 * DAY, saved, now), 20 * DAY);
});

test('after a restart only the calendar date is available', () => {
  const saved = { wallMs: 10 * DAY, uptimeMs: 5 * DAY, bootId: '5' };
  const now = { wallMs: 9 * DAY, uptimeMs: 100, bootId: '6' };
  assert.equal(trustedNowMs(10 * DAY, saved, now), 9 * DAY);
});

test('data saved before this feature has no clock reading: calendar date', () => {
  assert.equal(trustedNowMs(10 * DAY, undefined, { wallMs: 11 * DAY, uptimeMs: 1 }), 11 * DAY);
});

test('without boot IDs a smaller uptime means a restart', () => {
  const saved = { wallMs: 10 * DAY, uptimeMs: 9 * DAY };
  const now = { wallMs: 9 * DAY, uptimeMs: 1000 };
  assert.equal(trustedNowMs(10 * DAY, saved, now), 9 * DAY);
});
