// apps/mobile/src/core/security/contentKeys.ts
import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import { getRandomBytes, bufferToHex } from '@/modules/auth/lib/offlineCrypto';

/**
 * Key Management for Content Protection:
 * - Free content uses a locally generated device key kept in secure storage.
 * - Paid content uses a signed entitlement token / key issued after server entitlement.
 */
export async function getOrCreateDeviceKey(): Promise<string> {
  let key = await secureStorage.getString(STORAGE_KEYS.deviceKey);
  if (!key) {
    const bytes = getRandomBytes(32);
    key = bufferToHex(bytes);
    await secureStorage.setString(STORAGE_KEYS.deviceKey, key);
  }
  return key;
}

export async function getEntitlementKey(): Promise<string | null> {
  return secureStorage.getString(STORAGE_KEYS.entitlementKey);
}

export async function setEntitlementKey(key: string): Promise<void> {
  await secureStorage.setString(STORAGE_KEYS.entitlementKey, key);
}

export async function removeEntitlementKey(): Promise<void> {
  await secureStorage.remove(STORAGE_KEYS.entitlementKey);
}

