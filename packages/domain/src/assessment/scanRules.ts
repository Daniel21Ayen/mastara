// packages/domain/src/assessment/scanRules.ts
import { SCAN_FILE_MAX_BYTES, SCAN_FILE_TYPES } from '../constants/admin';

/** Why a file cannot be added, or null when it can. */
export function scanFileProblem(mime: string, sizeBytes: number): 'type' | 'size' | null {
  if (!(SCAN_FILE_TYPES as readonly string[]).includes(mime)) return 'type';
  if (sizeBytes > SCAN_FILE_MAX_BYTES) return 'size';
  return null;
}

/** An answer needs typed text, an attached file, or both. */
export function answerGiven(answer: { text: string; file: unknown }): boolean {
  return answer.text.trim() !== '' || Boolean(answer.file);
}

/** "1.4 MB" for a file size. */
export function fileSizeText(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
