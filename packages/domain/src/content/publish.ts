import type { CatalogStatus } from '../constants/admin';

export interface BilingualParts {
  title: { en: string; am: string };
  body: { en: string; am: string };
}

export type MissingPart = 'titleEn' | 'bodyEn' | 'titleAm' | 'bodyAm';

/**
 * A note reaches students only when both languages are complete (one bilingual record, SRS D8).
 * Drafts may have gaps. Returns what is still empty, in the order the editor shows it.
 */
export function missingForPublish(note: BilingualParts): MissingPart[] {
  const missing: MissingPart[] = [];
  if (!note.title.en.trim()) missing.push('titleEn');
  if (!note.body.en.trim()) missing.push('bodyEn');
  if (!note.title.am.trim()) missing.push('titleAm');
  if (!note.body.am.trim()) missing.push('bodyAm');
  return missing;
}

/** True when the Amharic view has something to show (title and text). */
export function hasAmharic(note: BilingualParts): boolean {
  return note.title.am.trim() !== '' && note.body.am.trim() !== '';
}

/**
 * Every save that leaves the note published is a new version students will see.
 * A draft keeps its number, and a note that never was published stays at 0.
 */
export function nextVersion(version: number, saveAs: CatalogStatus): number {
  return saveAs === 'PUBLISHED' ? version + 1 : version;
}
