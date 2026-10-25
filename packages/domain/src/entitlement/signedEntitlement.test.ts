import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  signEntitlementToken,
  verifyEntitlementTokenOffline,
} from './signedEntitlement';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const testPrivateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const testPublicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
process.env.ENTITLEMENT_PRIVATE_KEY = testPrivateKeyPem;

test('signed entitlement token: signs and verifies valid token offline', () => {
  const serverTime = Date.now();
  const expiresAt = new Date(serverTime + 30 * 24 * 3600 * 1000).toISOString();

  const token = signEntitlementToken({
    studentId: 'student-123',
    courseIds: ['course-math-101', 'course-phys-101'],
    expiresAt,
    serverTime,
  });

  const res = verifyEntitlementTokenOffline(token, {
    currentDeviceTimeMs: serverTime + 1000,
    lastSeenServerTimeMs: serverTime,
    publicKeyPem: testPublicKeyPem,
  });

  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.payload.studentId, 'student-123');
    assert.deepEqual(res.payload.courseIds, ['course-math-101', 'course-phys-101']);
    assert.equal(res.newLastSeenServerTimeMs, serverTime);
  }
});

test('signed entitlement token: rejects tampered signature', () => {
  const serverTime = Date.now();
  const token = signEntitlementToken({
    studentId: 'student-123',
    courseIds: ['course-math-101'],
    expiresAt: new Date(serverTime + 86400000).toISOString(),
    serverTime,
  });

  // Tamper with signature
  token.signature = 'deadbeef' + token.signature.slice(8);

  const res = verifyEntitlementTokenOffline(token, {
    currentDeviceTimeMs: serverTime + 500,
    lastSeenServerTimeMs: serverTime,
    publicKeyPem: testPublicKeyPem,
  });

  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.equal(res.reason, 'INVALID_SIGNATURE');
  }
});

test('signed entitlement token: rejects clock rollback attempt', () => {
  const serverTime = 1700000000000;
  const token = signEntitlementToken({
    studentId: 'student-123',
    courseIds: ['course-math-101'],
    expiresAt: new Date(serverTime + 86400000).toISOString(),
    serverTime,
  });

  // 1. Device time earlier than last seen server time
  const res1 = verifyEntitlementTokenOffline(token, {
    currentDeviceTimeMs: serverTime - 5000,
    lastSeenServerTimeMs: serverTime,
    publicKeyPem: testPublicKeyPem,
  });
  assert.equal(res1.valid, false);
  if (!res1.valid) {
    assert.equal(res1.reason, 'CLOCK_ROLLBACK_DETECTED');
  }

  // 2. Device time earlier than token issue time
  const res2 = verifyEntitlementTokenOffline(token, {
    currentDeviceTimeMs: serverTime - 10000,
    lastSeenServerTimeMs: 0,
    publicKeyPem: testPublicKeyPem,
  });
  assert.equal(res2.valid, false);
  if (!res2.valid) {
    assert.equal(res2.reason, 'CLOCK_ROLLBACK_DETECTED');
  }
});

test('signed entitlement token: rejects expired token', () => {
  const serverTime = Date.now() - 100000;
  const expiresAt = new Date(serverTime + 50000).toISOString();

  const token = signEntitlementToken({
    studentId: 'student-123',
    courseIds: ['course-math-101'],
    expiresAt,
    serverTime,
  });

  // Current device time is after expiresAt
  const res = verifyEntitlementTokenOffline(token, {
    currentDeviceTimeMs: serverTime + 60000,
    lastSeenServerTimeMs: serverTime,
    publicKeyPem: testPublicKeyPem,
  });

  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.equal(res.reason, 'TOKEN_EXPIRED');
  }
});
