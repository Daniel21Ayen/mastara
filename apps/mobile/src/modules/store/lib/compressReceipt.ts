// apps/mobile/src/modules/store/lib/compressReceipt.ts
import { ERROR_CODES, MAX_RECEIPT_BYTES, RECEIPT_COMPRESSION_STEPS } from '@mastara/domain';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { ApiError } from '@/core/network';

export interface Receipt {
  uri: string;
  bytes: number;
}

async function sizeOf(uri: string): Promise<number> {
  const response = await fetch(uri);
  return (await response.blob()).size;
}

/** Shrinks a screenshot step by step until it is under 300 KB, to save the student's mobile data. */
export async function compressReceipt(uri: string, originalWidth: number): Promise<Receipt> {
  for (const step of RECEIPT_COMPRESSION_STEPS) {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: Math.min(step.width, originalWidth) });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: step.quality, format: SaveFormat.JPEG });
    const bytes = await sizeOf(saved.uri);

    if (bytes <= MAX_RECEIPT_BYTES) return { uri: saved.uri, bytes };
  }
  throw new ApiError(ERROR_CODES.RECEIPT_TOO_LARGE);
}
