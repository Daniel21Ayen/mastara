// apps/mobile/src/modules/courses/phase4-access.test.ts
import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';

import { resolveOpen, type OpenResolution, type AccessState, ERROR_CODES } from '@mastara/domain';
import { readContentList } from '@/core/downloads/contentGateway';
import { ApiError } from '@/core/network/ApiError';

describe('Phase 4: Local-first access model & single open rule', () => {
  describe('Single Open Rule (resolveOpen matrix)', () => {
    const states: AccessState[] = ['PAID', 'FREE_TRIAL', 'LOCKED'];

    it('returns LOCKED whenever canOpenContent is false, regardless of download/online state', () => {
      for (const isDownloaded of [true, false]) {
        for (const isOnline of [true, false]) {
          assert.equal(
            resolveOpen({ access: 'LOCKED', isFree: false, isDownloaded, isOnline }),
            'LOCKED',
          );
          assert.equal(
            resolveOpen({ access: 'FREE_TRIAL', isFree: false, isDownloaded, isOnline }),
            'LOCKED',
          );
        }
      }
    });

    it('returns OPEN_LOCAL when content is allowed and downloaded', () => {
      // Online and downloaded
      assert.equal(
        resolveOpen({ access: 'PAID', isFree: false, isDownloaded: true, isOnline: true }),
        'OPEN_LOCAL',
      );
      // Offline and downloaded
      assert.equal(
        resolveOpen({ access: 'PAID', isFree: false, isDownloaded: true, isOnline: false }),
        'OPEN_LOCAL',
      );
      // Free item downloaded
      assert.equal(
        resolveOpen({ access: 'LOCKED', isFree: true, isDownloaded: true, isOnline: false }),
        'OPEN_LOCAL',
      );
    });

    it('returns OPEN_ONLINE when content is allowed, online, but not downloaded', () => {
      assert.equal(
        resolveOpen({ access: 'PAID', isFree: false, isDownloaded: false, isOnline: true }),
        'OPEN_ONLINE',
      );
      assert.equal(
        resolveOpen({ access: 'FREE_TRIAL', isFree: true, isDownloaded: false, isOnline: true }),
        'OPEN_ONLINE',
      );
      assert.equal(
        resolveOpen({ access: 'LOCKED', isFree: true, isDownloaded: false, isOnline: true }),
        'OPEN_ONLINE',
      );
    });

    it('returns NEEDS_INTERNET when content is allowed, but not downloaded and offline', () => {
      assert.equal(
        resolveOpen({ access: 'PAID', isFree: false, isDownloaded: false, isOnline: false }),
        'NEEDS_INTERNET',
      );
      assert.equal(
        resolveOpen({ access: 'FREE_TRIAL', isFree: true, isDownloaded: false, isOnline: false }),
        'NEEDS_INTERNET',
      );
      assert.equal(
        resolveOpen({ access: 'LOCKED', isFree: true, isDownloaded: false, isOnline: false }),
        'NEEDS_INTERNET',
      );
    });
  });

  describe('contentGateway: readContentList offline catalog fallback', () => {
    it('returns local catalog list when offline without throwing CONTENT_NOT_DOWNLOADED', async () => {
      const mockCatalogItems = [
        { id: 'topic-1', title: 'Module 1' },
        { id: 'topic-2', title: 'Module 2' },
      ];

      const result = await readContentList(
        async () => {
          throw new ApiError(ERROR_CODES.NETWORK_OFFLINE);
        },
        async () => mockCatalogItems,
      );

      assert.deepEqual(result, mockCatalogItems, 'Should return catalog items offline');
    });

    it('returns empty list rather than throwing CONTENT_NOT_DOWNLOADED if local catalog is empty', async () => {
      const result = await readContentList(
        async () => {
          throw new ApiError(ERROR_CODES.NETWORK_OFFLINE);
        },
        async () => [],
      );

      assert.deepEqual(result, [], 'Should safely return empty list');
    });
  });
});
