// packages/domain/src/catalog/courseCode.ts

/** "eng 101", "ENG101", and "CHEM-101" are normalized for lookup. */
export function normalizeCourseCode(value: string): string {
  return value.replace(/[\s-]+/g, '').toUpperCase();
}

/**
 * Standard university course codes, for example ENG101, MATH1011, FLEn 1011, or CHEM-101.
 * Supports 2-6 letters with 2-6 digits, or alphanumeric code with hyphens/underscores (3-20 chars).
 */
export function isValidCourseCode(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  const normalized = normalizeCourseCode(trimmed);
  return /^[A-Z]{2,6}\d{2,6}[A-Z]?$/i.test(normalized) || /^[A-Z0-9_-]{3,20}$/i.test(trimmed);
}

/** Short lower-case key for IDs: "Software Engineering" -> "software-engineering". */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
