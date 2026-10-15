// packages/domain/src/access/offlineAccess.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { daysUntil, offlineAccess } from './offlineAccess';

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

test('uses the exact expiry, not a rounded day count', () => {
  const cached = { access: 'PAID' as const, expiresAtMs: T0 + 2.5 * DAY, cachedAtMs: T0 };
  assert.equal(offlineAccess(cached, T0 + 2.4 * DAY).access, 'PAID');
  assert.equal(offlineAccess(cached, T0 + 2.6 * DAY).access, 'LOCKED'); // the old rounded value (3 days) would still have said PAID
});

test('days left count down from the exact expiry', () => {
  const cached = { access: 'PAID' as const, expiresAtMs: T0 + 3 * DAY, cachedAtMs: T0 };
  assert.equal(offlineAccess(cached, T0 + 1 * DAY).daysLeft, 2);
  assert.equal(offlineAccess(cached, T0 + 2.5 * DAY).daysLeft, 1);
});

test('older saved data with only a day count still works', () => {
  const cached = { access: 'PAID' as const, daysLeft: 3, cachedAtMs: T0 };
  assert.equal(offlineAccess(cached, T0 + 2 * DAY).access, 'PAID');
  assert.equal(offlineAccess(cached, T0 + 3 * DAY).access, 'LOCKED');
});

test('too long without the server locks paid access', () => {
  const cached = { access: 'PAID' as const, expiresAtMs: T0 + 60 * DAY, cachedAtMs: T0 };
  assert.equal(offlineAccess(cached, T0 + 6 * DAY).access, 'PAID');
  assert.equal(offlineAccess(cached, T0 + 8 * DAY).access, 'LOCKED');
});

test('a clock set before the cache time locks paid access', () => {
  const cached = { access: 'PAID' as const, expiresAtMs: T0 + 5 * DAY, cachedAtMs: T0 };
  assert.equal(offlineAccess(cached, T0 - 1000).access, 'LOCKED');
});

test('free trial and locked do not change', () => {
  assert.deepEqual(offlineAccess({ access: 'FREE_TRIAL', cachedAtMs: T0 }, T0 + 99 * DAY), { access: 'FREE_TRIAL' });
  assert.deepEqual(offlineAccess({ access: 'LOCKED', cachedAtMs: T0 }, T0), { access: 'LOCKED' });
});

test('daysUntil never goes below zero', () => {
  assert.equal(daysUntil(T0, T0 + DAY), 0);
});
