// packages/domain/src/content/resolveRead.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveContentList, resolveContentRead } from './resolveRead';

const OFFLINE = new Error('offline');
const isOffline = (error: unknown) => error === OFFLINE;
const notDownloaded = () => new Error('NOT_DOWNLOADED');

function parts<T>(over: { local?: { found: true; value: T } | { found: false }; load?: () => Promise<T> }) {
  const calls = { load: 0 };
  return {
    calls,
    parts: {
      local: async () => over.local ?? ({ found: false } as const),
      load: async () => {
        calls.load += 1;
        return (over.load ?? (async () => 'from-server' as unknown as T))();
      },
      isOffline,
      notDownloaded,
    },
  };
}

test('a downloaded item is read from the phone and the server is not called', async () => {
  const { parts: p, calls } = parts<string>({ local: { found: true, value: 'from-phone' } });
  assert.equal(await resolveContentRead(p), 'from-phone');
  assert.equal(calls.load, 0);
});

test('a saved "nothing" (item not found) is still a downloaded answer', async () => {
  const { parts: p, calls } = parts<string | null>({ local: { found: true, value: null } });
  assert.equal(await resolveContentRead(p), null);
  assert.equal(calls.load, 0);
});

test('the first time (not downloaded, online) the item comes from the server', async () => {
  const { parts: p, calls } = parts<string>({});
  assert.equal(await resolveContentRead(p), 'from-server');
  assert.equal(calls.load, 1);
});

test('offline and not downloaded: a clear error, never an old copy', async () => {
  const { parts: p } = parts<string>({ load: async () => Promise.reject(OFFLINE) });
  await assert.rejects(resolveContentRead(p), /NOT_DOWNLOADED/);
});

test('other errors (for example not allowed) are not hidden as "not downloaded"', async () => {
  const denied = new Error('FORBIDDEN');
  const { parts: p } = parts<string>({ load: async () => Promise.reject(denied) });
  await assert.rejects(resolveContentRead(p), /FORBIDDEN/);
});

test('a list online comes from the server', async () => {
  const items = await resolveContentList({ load: async () => ['a', 'b'], downloaded: async () => ['x'], isOffline, notDownloaded });
  assert.deepEqual(items, ['a', 'b']);
});

test('a list offline shows only what was downloaded', async () => {
  const items = await resolveContentList({ load: async () => Promise.reject(OFFLINE), downloaded: async () => ['x'], isOffline, notDownloaded });
  assert.deepEqual(items, ['x']);
});

test('a list offline with nothing downloaded says so', async () => {
  await assert.rejects(
    resolveContentList({ load: async () => Promise.reject(OFFLINE), downloaded: async () => [], isOffline, notDownloaded }),
    /NOT_DOWNLOADED/,
  );
});

test('a list does not hide a real server error behind the downloads', async () => {
  const broken = new Error('SERVER');
  await assert.rejects(
    resolveContentList({ load: async () => Promise.reject(broken), downloaded: async () => ['x'], isOffline, notDownloaded }),
    /SERVER/,
  );
});
