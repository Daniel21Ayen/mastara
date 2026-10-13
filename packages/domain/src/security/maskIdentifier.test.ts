// packages/domain/src/security/maskIdentifier.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { maskIdentifier } from './maskIdentifier';

test('a phone number keeps the first three and last two characters', () => {
  assert.equal(maskIdentifier('0911223344'), '091•••44');
});

test('an email keeps the first three and last two characters', () => {
  assert.equal(maskIdentifier('abebe@mail.com'), 'abe•••om');
});

test('short and empty values never reveal the whole thing', () => {
  assert.equal(maskIdentifier(''), '');
  assert.equal(maskIdentifier('  '), '');
  assert.equal(maskIdentifier('12345'), '1•••');
});
