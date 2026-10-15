// packages/domain/src/catalog/courseCode.ts

/** "eng 101 " and "ENG101" are the same code. */
export function normalizeCourseCode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/** Two to five letters followed by three digits, for example ENG101 or MAT112. */
export function isValidCourseCode(value: string): boolean {
  return /^[A-Z]{2,5}\d{3}$/.test(normalizeCourseCode(value));
}

/** Short lower-case key for IDs: "Software Engineering" -> "software-engineering". */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
