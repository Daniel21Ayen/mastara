// apps/mobile/src/core/mock/delay.ts
import { ERROR_CODES } from '@mastara/domain';

import { ApiError, isOnline } from '@/core/network';

/**
 * Simulates a network call so loading states are visible while we use mock data.
 * Like a real request it fails when the phone is offline, so offline behaviour can be tested now.
 */
export async function simulateLatency(ms = 250): Promise<void> {
  if (!isOnline()) throw new ApiError(ERROR_CODES.NETWORK_OFFLINE);
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
