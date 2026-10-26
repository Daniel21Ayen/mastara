// apps/mobile/src/modules/auth/offlineAccount.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { authApi, getAccountState, realAuthApi } from './api/auth.api';
import { httpClient } from '@/core/network';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

test('offline account: LOCAL_ONLY lifecycle with zero network requests before purchase', async () => {
  // Clear any existing session or pending sync records
  await secureStorage.remove(STORAGE_KEYS.pendingRemoteSync);
  await secureStorage.remove(STORAGE_KEYS.offlineUsers);

  // Network spy tracking any network requests
  const networkRequests: { method: string; path: string; body?: unknown }[] = [];
  const origPost = httpClient.post;
  const origGet = httpClient.get;
  const origPut = httpClient.put;

  (httpClient as any).post = async (path: string, body?: unknown) => {
    networkRequests.push({ method: 'POST', path, body });
    return { token: 'mock-network-token', user: { id: 'u-remote', name: 'Remote', identifier: '0911000000' } };
  };
  (httpClient as any).get = async (path: string) => {
    networkRequests.push({ method: 'GET', path });
    return {};
  };
  (httpClient as any).put = async (path: string, body?: unknown) => {
    networkRequests.push({ method: 'PUT', path, body });
    return {};
  };

  try {
    // 1. Register offline
    const regResult = await authApi.register({
      name: 'Binyam Haile',
      identifier: '0911223344',
      password: 'StrongPassword123!',
    });

    assert.equal(regResult.user.name, 'Binyam Haile');
    assert.equal(regResult.user.identifier, '0911223344');
    assert.equal(regResult.token, 'local-offline-token');

    // State must explicitly be LOCAL_ONLY
    const stateAfterReg = await getAccountState();
    assert.equal(stateAfterReg, 'LOCAL_ONLY');

    // 2. Login offline
    const loginResult = await authApi.login({
      identifier: '0911223344',
      password: 'StrongPassword123!',
    });

    assert.equal(loginResult.user.identifier, '0911223344');
    assert.equal(loginResult.token, 'local-offline-token');

    // 3. Update account offline
    const updatedUser = await authApi.updateAccount(loginResult.user, {
      name: 'Binyam H. Updated',
      identifier: '0911223344',
    });

    assert.equal(updatedUser.name, 'Binyam H. Updated');

    // 4. Assert ZERO student-data network requests were made prior to purchase!
    assert.equal(
      networkRequests.length,
      0,
      `Expected zero network calls before purchase, but received: ${JSON.stringify(networkRequests)}`,
    );

    // 5. Simulate First Purchase: student performs remote registration
    const pendingRecord = await secureStorage.getJson<any>(STORAGE_KEYS.pendingRemoteSync);
    assert.ok(pendingRecord);
    assert.equal(pendingRecord.accountState, 'LOCAL_ONLY');

    // Registration over network happens during first purchase
    const remoteResult = await realAuthApi.register({
      name: pendingRecord.name,
      identifier: pendingRecord.identifier,
      password: 'StrongPassword123!',
      localAccountId: pendingRecord.localAccountId,
    });

    // Account transitions to REGISTERED_REMOTE
    pendingRecord.accountState = 'REGISTERED_REMOTE';
    pendingRecord.purchased = true;
    await secureStorage.setJson(STORAGE_KEYS.pendingRemoteSync, pendingRecord);

    const stateAfterPurchase = await getAccountState();
    assert.equal(stateAfterPurchase, 'REGISTERED_REMOTE');

    // Network request was made only for the purchase registration
    assert.equal(networkRequests.length, 1);
    assert.equal(networkRequests[0]?.path, '/auth/register-offline');

    // 6. Test offline login in airplane mode (FR-A01, FR-A05)
    // Offline sign-in succeeds only with the matching password
    const offlineLoginSuccess = await authApi.login({
      identifier: '0911223344',
      password: 'StrongPassword123!',
    });
    assert.equal(offlineLoginSuccess.user.identifier, '0911223344');

    // Invalid password must fail offline
    await assert.rejects(
      async () => {
        await authApi.login({
          identifier: '0911223344',
          password: 'WrongPassword!',
        });
      },
      (err: any) => err.message.includes('Invalid credentials') || err.message.includes('failed') || err.code === 'UNAUTHORIZED',
    );
  } finally {
    httpClient.post = origPost;
    httpClient.get = origGet;
    httpClient.put = origPut;
  }
});
