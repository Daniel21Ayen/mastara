// packages/domain/src/exam/submission.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ALLOWED_OVERRUN_MS,
  EXAM_MINUTES_MAX,
  EXAM_MINUTES_MIN,
  elapsedAfterDowntime,
  isOverdue,
  isValidExamMinutes,
  withinDuration,
} from './submission';

const MIN = 60_000;

test('leaving does not pause the clock: time away is added', () => {
  assert.equal(elapsedAfterDowntime(10 * MIN, 5 * MIN, 30 * MIN), 15 * MIN);
});

test('time away beyond the duration is capped and the sitting is overdue', () => {
  const elapsed = elapsedAfterDowntime(10 * MIN, 90 * MIN, 30 * MIN);
  assert.equal(elapsed, 30 * MIN);
  assert.equal(isOverdue(elapsed, 30 * MIN), true);
});

test('a sitting with time left is not overdue', () => {
  assert.equal(isOverdue(29 * MIN, 30 * MIN), false);
});

test('negative inputs never reduce the time used', () => {
  assert.equal(elapsedAfterDowntime(10 * MIN, -5 * MIN, 30 * MIN), 10 * MIN);
});

test('server check allows a small overrun only', () => {
  assert.equal(withinDuration(30 * MIN + ALLOWED_OVERRUN_MS, 30 * MIN), true);
  assert.equal(withinDuration(30 * MIN + ALLOWED_OVERRUN_MS + 1, 30 * MIN), false);
});

test('the admin-set exam time must be a whole number of minutes within limits', () => {
  assert.equal(isValidExamMinutes(45), true);
  assert.equal(isValidExamMinutes(EXAM_MINUTES_MIN), true);
  assert.equal(isValidExamMinutes(EXAM_MINUTES_MAX), true);
  for (const bad of [0, 4, 241, 9999, -30, 30.5, Number.NaN]) assert.equal(isValidExamMinutes(bad), false, String(bad));
});
