// apps/mobile/src/modules/store/lib/compressReceipt.ts
import { ERROR_CODES, MAX_RECEIPT_BYTES, RECEIPT_COMPRESSION_STEPS } from '@mastara/domain';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { ApiError } from '@/core/network';

export interface Receipt {
  uri: string;
  bytes: number;
}

/** Shrinks a screenshot step by step until it is under 300 KB, to save the student's mobile data. */
export async function compressReceipt(uri: string, originalWidth: number): Promise<Receipt> {
  for (const step of RECEIPT_COMPRESSION_STEPS) {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: Math.min(step.width, originalWidth) });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: step.quality, format: SaveFormat.JPEG, base64: true });
    const bytes = saved.base64 ? Math.ceil((saved.base64.length * 3) / 4) : 1024;

    if (bytes <= MAX_RECEIPT_BYTES) return { uri: saved.uri, bytes };
  }
  throw new ApiError(ERROR_CODES.RECEIPT_TOO_LARGE);
}
