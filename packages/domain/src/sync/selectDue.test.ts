// packages/domain/src/sync/selectDue.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { selectDueOps } from './selectDue';

const op = (id: string, type: string, attempts = 0, lastAttemptMs: number | null = null) => ({ id, type, attempts, lastAttemptMs });

test('never-tried changes are all sent, oldest first', () => {
  const ids = selectDueOps([op('1', 'A'), op('2', 'B'), op('3', 'A')], 1_000).map((o) => o.id);
  assert.deepEqual(ids, ['1', '2', '3']);
});

test('a waiting change holds back newer changes of the SAME type only', () => {
  const now = 100_000;
  const pending = [op('1', 'PROFILE', 3, now - 1_000), op('2', 'PROFILE'), op('3', 'EXAM')];
  assert.deepEqual(selectDueOps(pending, now).map((o) => o.id), ['3']);
});

test('once its wait has passed the change and the ones behind it go out together', () => {
  const now = 100_000;
  const pending = [op('1', 'PROFILE', 1, now - 5_000), op('2', 'PROFILE')];
  assert.deepEqual(selectDueOps(pending, now).map((o) => o.id), ['1', '2']);
});

test('the limit is respected', () => {
  const pending = Array.from({ length: 10 }, (_, i) => op(String(i), 'A'));
  assert.equal(selectDueOps(pending, 0, 4).length, 4);
});
