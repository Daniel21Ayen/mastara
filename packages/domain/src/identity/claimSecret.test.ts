// packages/domain/src/identity/claimSecret.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { generateClaimSecret, hashClaimSecret, verifyClaimSecret } from './claimSecret';

test('claimSecret: generate, hash and verify flow (REG-10, REG-14)', () => {
  const secret = generateClaimSecret();
  assert.equal(typeof secret, 'string');
  assert.equal(secret.length, 64); // 32 bytes hex = 64 characters

  const hash = hashClaimSecret(secret);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 64); // SHA-256 = 64 hex chars

  // Deterministic hashing
  assert.equal(hashClaimSecret(secret), hash);

  // Verification succeeds with matching secret
  assert.equal(verifyClaimSecret(secret, hash), true);

  // Verification fails with wrong secret
  const wrongSecret = generateClaimSecret();
  assert.equal(verifyClaimSecret(wrongSecret, hash), false);
  assert.equal(verifyClaimSecret('tampered-secret', hash), false);
  assert.equal(verifyClaimSecret('', hash), false);
});

test('claimSecret: constant known SHA-256 vector test', () => {
  // sha256("test-secret-123") = 33e29618af5c636e782cfadefb698192ef7b2d8e5567d3c8cf560f61697cc6f5
  const knownSecret = 'test-secret-123';
  const expectedHash = '33e29618af5c636e782cfadefb698192ef7b2d8e5567d3c8cf560f61697cc6f5';
  assert.equal(hashClaimSecret(knownSecret), expectedHash);
  assert.equal(verifyClaimSecret(knownSecret, expectedHash), true);
  assert.equal(verifyClaimSecret('wrong', expectedHash), false);
});
