// apps/mobile/src/modules/device-lock/api/device.api.ts
import { httpClient } from '@/core/network';

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

export const deviceApi: DeviceApi = {
  async registerDevice(input) {
    await httpClient.post('/device/register', {
      deviceId: input.deviceId,
      deviceName: input.deviceName,
    });
  },
  async releaseDevice(_userId) {
    await httpClient.post('/device/release');
  },
};
