// apps/mobile/src/core/security/entitlementVerification.ts
import {
  EMBEDDED_ENTITLEMENT_PUBLIC_KEY,
  verifyEntitlementTokenOffline,
  type SignedEntitlementToken,
} from '@mastara/domain';

import { secureStorage, STORAGE_KEYS } from '@/core/storage/secureStorage';
import { removeEntitlementKey } from './contentKeys';

export interface VerifyAccessOptions {
  currentDeviceTimeMs?: number;
  lastSeenServerTimeMs?: number;
  publicKeyPem?: string;
  token?: SignedEntitlementToken | null;
}

export type CourseAccessVerification =
  | { allowed: true; expiresAt: string }
  | {
      allowed: false;
      reason:
        | 'UNSIGNED_LOCAL_STORAGE'
        | 'INVALID_SIGNATURE'
        | 'TOKEN_EXPIRED'
        | 'CLOCK_ROLLBACK_DETECTED'
        | 'COURSE_NOT_IN_ENTITLEMENT';
    };

/**
 * Validates course access for paid content.
 * Never trusts an unsigned or tampered PAID flag in local storage.
 * Requires a cryptographically verified Ed25519 signed entitlement token.
 */
export async function verifyCourseAccess(
  courseId: string,
  options: VerifyAccessOptions = {},
): Promise<CourseAccessVerification> {
  const token =
    options.token !== undefined
      ? options.token
      : await secureStorage.getJson<SignedEntitlementToken>(STORAGE_KEYS.entitlementKey);

  if (!token || !token.signature || !token.payload) {
    return { allowed: false, reason: 'UNSIGNED_LOCAL_STORAGE' };
  }

  const lastSeen =
    options.lastSeenServerTimeMs ??
    (await secureStorage
      .getString(STORAGE_KEYS.lastSeenServerTime)
      .then((s) => (s ? Number(s) : 0)));

  const result = verifyEntitlementTokenOffline(token, {
    currentDeviceTimeMs: options.currentDeviceTimeMs,
    lastSeenServerTimeMs: lastSeen,
    publicKeyPem: options.publicKeyPem ?? EMBEDDED_ENTITLEMENT_PUBLIC_KEY,
  });

  if (!result.valid) {
    if (result.reason === 'TOKEN_EXPIRED') {
      // Remove entitlement key when access ends
      await removeEntitlementKey();
    }
    return { allowed: false, reason: result.reason };
  }

  // Update last seen server time monotonically
  if (result.newLastSeenServerTimeMs > lastSeen) {
    await secureStorage.setString(
      STORAGE_KEYS.lastSeenServerTime,
      String(result.newLastSeenServerTimeMs),
    );
  }

  if (!result.payload.courseIds.includes(courseId)) {
    return { allowed: false, reason: 'COURSE_NOT_IN_ENTITLEMENT' };
  }

  return { allowed: true, expiresAt: result.payload.expiresAt };
}
