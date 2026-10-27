// packages/domain/src/identity/studentCode.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { formatStudentId, parseStudentId, isValidStudentCode } from './studentCode';

test('formatStudentId: formats atomic counter into MS0001 format (REG-08, ADM-02)', () => {
  assert.equal(formatStudentId(1), 'MS0001');
  assert.equal(formatStudentId(2), 'MS0002');
  assert.equal(formatStudentId(42), 'MS0042');
  assert.equal(formatStudentId(999), 'MS0999');
  assert.equal(formatStudentId(1000), 'MS1000');
  assert.equal(formatStudentId(9999), 'MS9999');
  assert.equal(formatStudentId(10000), 'MS10000');
  assert.equal(formatStudentId(123456), 'MS123456');

  // Invalid sequences throw
  assert.throws(() => formatStudentId(0), /Invalid sequence number/);
  assert.throws(() => formatStudentId(-5), /Invalid sequence number/);
  assert.throws(() => formatStudentId(1.5), /Invalid sequence number/);
});

test('parseStudentId: parses MS code back to integer sequence', () => {
  assert.equal(parseStudentId('MS0001'), 1);
  assert.equal(parseStudentId('MS0042'), 42);
  assert.equal(parseStudentId('MS9999'), 9999);
  assert.equal(parseStudentId('MS10000'), 10000);

  // Invalid formats return null
  assert.equal(parseStudentId('MS001'), null); // less than 4 digits
  assert.equal(parseStudentId('ms0001'), null);
  assert.equal(parseStudentId('STUDENT0001'), null);
  assert.equal(parseStudentId('MS0000'), null);
  assert.equal(parseStudentId(''), null);
});

test('isValidStudentCode: boolean checker', () => {
  assert.equal(isValidStudentCode('MS0001'), true);
  assert.equal(isValidStudentCode('MS9999'), true);
  assert.equal(isValidStudentCode('MS10005'), true);
  assert.equal(isValidStudentCode('MS001'), false);
  assert.equal(isValidStudentCode('uuid-123-abc'), false);
});
