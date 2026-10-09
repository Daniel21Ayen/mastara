// apps/mobile/src/core/device/device.ts
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';

import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';

/** Stable random ID kept in the secure store. Sent as the `x-device-id` header by the real API client. */
export async function getDeviceId(): Promise<string> {
  const existing = await secureStorage.getString(STORAGE_KEYS.deviceId);
  if (existing) return existing;

  const created = Crypto.randomUUID();
  await secureStorage.setString(STORAGE_KEYS.deviceId, created);
  return created;
}

export function getDeviceName(): string {
  return Device.modelName ?? Device.deviceName ?? 'Android phone';
}
