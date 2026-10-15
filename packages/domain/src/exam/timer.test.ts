// packages/domain/src/exam/timer.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatClock, isExpired, remainingMs, startTimer, tickTimer } from './timer';

test('time only moves forward', () => {
  let timer = startTimer(30 * 60_000, 1_000);
  timer = tickTimer(timer, 11_000);
  assert.equal(timer.elapsedMs, 10_000);
  timer = tickTimer(timer, 5_000); // clock reading goes backwards: adds nothing
  assert.equal(timer.elapsedMs, 10_000);
  timer = tickTimer(timer, 15_000); // continues from the new reading
  assert.equal(timer.elapsedMs, 20_000);
});

test('a long gap (phone asleep) is charged in full and capped at the duration', () => {
  const timer = tickTimer(startTimer(30 * 60_000, 0), 45 * 60_000);
  assert.equal(timer.elapsedMs, 30 * 60_000);
  assert.equal(isExpired(timer), true);
  assert.equal(remainingMs(timer), 0);
});

test('formatClock rounds up so 0:00 only shows at the very end', () => {
  assert.equal(formatClock(30 * 60_000), '30:00');
  assert.equal(formatClock(61_001), '1:02');
  assert.equal(formatClock(3_725_000), '1:02:05');
  assert.equal(formatClock(0), '0:00');
});
