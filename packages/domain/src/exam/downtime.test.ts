// packages/domain/src/exam/downtime.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { downtimeMs } from './downtime';

const MIN = 60_000;

test('normal gap: both clocks agree', () => {
  const saved = { wallMs: 1_000_000, uptimeMs: 500_000, bootId: '7' };
  const now = { wallMs: 1_000_000 + 10 * MIN, uptimeMs: 500_000 + 10 * MIN, bootId: '7' };
  assert.equal(downtimeMs(saved, now), 10 * MIN);
});

test('date set back while the phone stayed on: uptime still counts the gap', () => {
  const saved = { wallMs: 5_000_000, uptimeMs: 100_000, bootId: '7' };
  const now = { wallMs: 5_000_000 - 3_600_000, uptimeMs: 100_000 + 10 * MIN, bootId: '7' };
  assert.equal(downtimeMs(saved, now), 10 * MIN);
});

test('date set forward costs the student the larger gap', () => {
  const saved = { wallMs: 0, uptimeMs: 0, bootId: '7' };
  const now = { wallMs: 60 * MIN, uptimeMs: 5 * MIN, bootId: '7' };
  assert.equal(downtimeMs(saved, now), 60 * MIN);
});

test('restart: uptime restarts from zero, only the wall clock counts', () => {
  const saved = { wallMs: 0, uptimeMs: 9_000_000, bootId: '7' };
  const now = { wallMs: 8 * MIN, uptimeMs: 2 * MIN, bootId: '8' };
  assert.equal(downtimeMs(saved, now), 8 * MIN);
});

test('restart where the new uptime happens to be larger is still caught by the boot ID', () => {
  const saved = { wallMs: 0, uptimeMs: 1 * MIN, bootId: '7' };
  const now = { wallMs: 2 * MIN, uptimeMs: 500 * MIN, bootId: '8' };
  assert.equal(downtimeMs(saved, now), 2 * MIN); // without boot IDs this would wrongly charge 499 minutes
});

test('without boot IDs a smaller uptime is read as a restart', () => {
  const saved = { wallMs: 0, uptimeMs: 9_000_000 };
  const now = { wallMs: 4 * MIN, uptimeMs: 1 * MIN };
  assert.equal(downtimeMs(saved, now), 4 * MIN);
});

test('never negative', () => {
  const saved = { wallMs: 100, uptimeMs: 100, bootId: '7' };
  const now = { wallMs: 0, uptimeMs: 50, bootId: '7' };
  assert.equal(downtimeMs(saved, now), 0);
});
