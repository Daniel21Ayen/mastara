// packages/domain/src/payments/receipt.ts
/** Receipt screenshots are compressed on the phone to save student data. */
export const MAX_RECEIPT_BYTES = 300 * 1024;

export interface CompressionStep {
  width: number;
  quality: number;
}

/** Tried in order until the image is under MAX_RECEIPT_BYTES. */
export const RECEIPT_COMPRESSION_STEPS: readonly CompressionStep[] = [
  { width: 1080, quality: 0.8 },
  { width: 1080, quality: 0.6 },
  { width: 900, quality: 0.5 },
  { width: 720, quality: 0.4 },
  { width: 600, quality: 0.3 },
];
