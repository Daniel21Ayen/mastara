// packages/domain/src/identity/studentCode.ts

const STUDENT_CODE_PREFIX = 'MS';
const MIN_DIGITS = 4;
const STUDENT_CODE_REGEX = /^MS(\d{4,})$/;

/**
 * Formats a sequential counter number into the official student ID (e.g. 1 -> "MS0001", 42 -> "MS0042", 10000 -> "MS10000").
 * Requirements: REG-08, ADM-02.
 */
export function formatStudentId(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new Error(`Invalid sequence number for student ID: ${sequenceNumber}. Must be a positive integer.`);
  }
  const padded = sequenceNumber.toString().padStart(MIN_DIGITS, '0');
  return `${STUDENT_CODE_PREFIX}${padded}`;
}

/**
 * Parses a student code string back into its sequence number, or null if invalid format.
 */
export function parseStudentId(code: string): number | null {
  if (!code || typeof code !== 'string') return null;
  const match = STUDENT_CODE_REGEX.exec(code.trim());
  if (!match || !match[1]) return null;
  const num = parseInt(match[1], 10);
  return Number.isNaN(num) || num < 1 ? null : num;
}

/**
 * Checks whether a given string is a valid student code (e.g. "MS0001").
 */
export function isValidStudentCode(code: string): boolean {
  return parseStudentId(code) !== null;
}
