import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, timingSafeEqual } from '../lib/offlineCrypto';
import { checkLockout, recordFailedAttempt, clearLockout } from '../lib/loginLockout';
import { authApi } from './auth.api';
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

test('offlineCrypto: generates salted hashes and verifies in constant time', async () => {
  const pwd = 'StudentPassword2026!';
  const record1 = await hashPassword(pwd);
  const record2 = await hashPassword(pwd);

  // Salts must be unique per generation
  assert.notEqual(record1.salt, record2.salt);
  assert.notEqual(record1.hash, record2.hash);

  // Correct password matches
  const valid = await verifyPassword(pwd, record1);
  assert.equal(valid, true);

  // Wrong password fails
  const invalid = await verifyPassword('WrongPassword', record1);
  assert.equal(invalid, false);

  // timingSafeEqual verifies strings securely
  assert.equal(timingSafeEqual('abcdef', 'abcdef'), true);
  assert.equal(timingSafeEqual('abcdef', 'abcdeg'), false);
  assert.equal(timingSafeEqual('abcdef', 'abc'), false);
});

test('loginLockout: enforces exponential backoff on repeated failures', async () => {
  const identifier = 'locked_student@test.com';
  await clearLockout(identifier);

  // Initial state: not locked
  let status = await checkLockout(identifier);
  assert.equal(status.locked, false);

  // 1st failure
  await recordFailedAttempt(identifier);
  status = await checkLockout(identifier);
  assert.equal(status.locked, false);

  // 2nd failure
  await recordFailedAttempt(identifier);
  status = await checkLockout(identifier);
  assert.equal(status.locked, false);

  // 3rd failure: triggers 30s lockout
  const res = await recordFailedAttempt(identifier);
  assert.equal(res.locked, true);
  assert.ok(res.remainingSeconds > 0 && res.remainingSeconds <= 30);

  status = await checkLockout(identifier);
  assert.equal(status.locked, true);

  // Clearing lockout resets state
  await clearLockout(identifier);
  status = await checkLockout(identifier);
  assert.equal(status.locked, false);
});

test('authApi: registers with salted hash and migrates legacy plaintext password', async () => {
  const identifier = 'migrated_user@mastara.et';
  await clearLockout(identifier);

  // 1. Register new offline account
  const registered = await authApi.register({
    name: 'Abebe Kebede',
    identifier,
    password: 'SecurePassWord77!',
  });
  assert.ok(registered.token);

  // Inspect storage: password must be hashed, NOT plaintext
  const registry = await secureStorage.getJson<Record<string, any>>(STORAGE_KEYS.offlineUsers);
  const userRecord = registry?.[identifier.toLowerCase()];
  assert.ok(userRecord);
  assert.equal(userRecord.password, undefined, 'Plaintext password must NOT be stored in registration');
  assert.ok(userRecord.passwordHash, 'Salted PBKDF2 hash record must exist');

  // Verify login with hashed password
  const loggedIn = await authApi.login({
    identifier,
    password: 'SecurePassWord77!',
  });
  assert.ok(loggedIn.token);

  // 2. Simulate legacy plaintext account in storage
  const legacyId = 'legacy_student@mastara.et';
  const legacyRegistry = (await secureStorage.getJson<Record<string, any>>(STORAGE_KEYS.offlineUsers)) || {};
  legacyRegistry[legacyId] = {
    userId: 'u-legacy',
    name: 'Legacy Student',
    identifier: legacyId,
    password: 'OldPlaintextPassword123',
    purchased: false,
  };
  await secureStorage.setJson(STORAGE_KEYS.offlineUsers, legacyRegistry);

  // Log in with legacy account
  const legacyLogin = await authApi.login({
    identifier: legacyId,
    password: 'OldPlaintextPassword123',
  });
  assert.ok(legacyLogin.token);

  // Verify that legacy plaintext was erased and converted to passwordHash
  const updatedRegistry = await secureStorage.getJson<Record<string, any>>(STORAGE_KEYS.offlineUsers);
  const migratedRecord = updatedRegistry?.[legacyId];
  assert.equal(migratedRecord.password, undefined, 'Legacy plaintext password MUST be erased after login');
  assert.ok(migratedRecord.passwordHash, 'Salted hash MUST be created in place of legacy plaintext');

  // Login again to confirm migrated hash works
  const secondLogin = await authApi.login({
    identifier: legacyId,
    password: 'OldPlaintextPassword123',
  });
  assert.ok(secondLogin.token);
});
