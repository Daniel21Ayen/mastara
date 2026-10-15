// apps/mobile/src/modules/device-lock/api/device.api.ts
import { ERROR_CODES } from '@mastara/domain';

import { env } from '@/core/config/env';
import { ApiError } from '@/core/network';
import { simulateLatency } from '@/core/mock/delay';

export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  deviceName: string;
}

export interface DeviceApi {
  /** Binds this phone to the account. Throws ApiError(DEVICE_MISMATCH_LOCKED) if another phone owns it. */
  registerDevice(input: RegisterDeviceInput): Promise<void>;
  /** Frees the account so another phone can be registered. Called from the bound phone. */
  releaseDevice(userId: string): Promise<void>;
}

// Mock server memory: userId -> bound device ID.
const bindings = new Map<string, string>();

const mockDeviceApi: DeviceApi = {
  async registerDevice({ userId, deviceId }) {
    await simulateLatency();

    // Demo rule: an account whose ID contains "locked" is already bound to another phone.
    const bound = bindings.get(userId) ?? (userId.includes('locked') ? 'another-phone' : undefined);
    if (bound && bound !== deviceId) throw new ApiError(ERROR_CODES.DEVICE_MISMATCH_LOCKED);

    bindings.set(userId, deviceId);
  },
  async releaseDevice(userId) {
    await simulateLatency();
    bindings.delete(userId);
  },
};

function createDeviceApi(): DeviceApi {
  if (env.useMocks) return mockDeviceApi;
  throw new Error('The real device API is added in the backend integration phase.');
}

export const deviceApi = createDeviceApi();
