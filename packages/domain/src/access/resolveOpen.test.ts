// packages/domain/src/access/resolveOpen.test.ts
import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';

import type { AccessState } from '../constants/learning';
import { resolveOpen, type OpenResolution } from './resolveOpen';

describe('Phase 4: resolveOpen access matrix', () => {
  const accessStates: AccessState[] = ['PAID', 'FREE_TRIAL', 'LOCKED'];
  const booleans = [true, false];

  it('tests every row in the 24-combination truth matrix', () => {
    let testCount = 0;

    for (const access of accessStates) {
      for (const isFree of booleans) {
        for (const isDownloaded of booleans) {
          for (const isOnline of booleans) {
            testCount += 1;
            const res = resolveOpen({ access, isFree, isDownloaded, isOnline });

            const canOpen = access === 'PAID' || isFree;
            let expected: OpenResolution;

            if (!canOpen) {
              expected = 'LOCKED';
            } else if (isDownloaded) {
              expected = 'OPEN_LOCAL';
            } else if (isOnline) {
              expected = 'OPEN_ONLINE';
            } else {
              expected = 'NEEDS_INTERNET';
            }

            assert.equal(
              res,
              expected,
              `Failed for access=${access}, isFree=${isFree}, isDownloaded=${isDownloaded}, isOnline=${isOnline}: expected ${expected}, got ${res}`,
            );
          }
        }
      }
    }

    assert.equal(testCount, 24, 'All 24 matrix combinations must be tested');
  });

  describe('Explicit behavioral cases', () => {
    it('LOCKED when user has FREE_TRIAL and item is NOT free', () => {
      assert.equal(
        resolveOpen({ access: 'FREE_TRIAL', isFree: false, isDownloaded: false, isOnline: true }),
        'LOCKED',
      );
      assert.equal(
        resolveOpen({ access: 'FREE_TRIAL', isFree: false, isDownloaded: true, isOnline: false }),
        'LOCKED',
      );
    });

    it('LOCKED when user is LOCKED and item is NOT free', () => {
      assert.equal(
        resolveOpen({ access: 'LOCKED', isFree: false, isDownloaded: false, isOnline: true }),
        'LOCKED',
      );
    });

    it('OPEN_LOCAL when paid and downloaded (online or offline)', () => {
      assert.equal(
        resolveOpen({ access: 'PAID', isFree: false, isDownloaded: true, isOnline: true }),
        'OPEN_LOCAL',
      );
      assert.equal(
        resolveOpen({ access: 'PAID', isFree: false, isDownloaded: true, isOnline: false }),
        'OPEN_LOCAL',
      );
    });

    it('OPEN_ONLINE when allowed, not downloaded, and online', () => {
      // Paid
      assert.equal(
        resolveOpen({ access: 'PAID', isFree: false, isDownloaded: false, isOnline: true }),
        'OPEN_ONLINE',
      );
      // Free item for free trial user
      assert.equal(
        resolveOpen({ access: 'FREE_TRIAL', isFree: true, isDownloaded: false, isOnline: true }),
        'OPEN_ONLINE',
      );
      // Free item for locked user
      assert.equal(
        resolveOpen({ access: 'LOCKED', isFree: true, isDownloaded: false, isOnline: true }),
        'OPEN_ONLINE',
      );
    });

    it('NEEDS_INTERNET when allowed, not downloaded, and offline', () => {
      // Paid user in airplane mode trying to open streaming lesson
      assert.equal(
        resolveOpen({ access: 'PAID', isFree: false, isDownloaded: false, isOnline: false }),
        'NEEDS_INTERNET',
      );
      // Free trial user in airplane mode
      assert.equal(
        resolveOpen({ access: 'FREE_TRIAL', isFree: true, isDownloaded: false, isOnline: false }),
        'NEEDS_INTERNET',
      );
    });
  });
});
