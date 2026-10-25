// Use safe dynamic loader so Metro / React Native bundling does not fail on Node standard library
const getNodeCrypto = () => {
  try {
    const proc = (globalThis as any).process;
    if (typeof proc?.getBuiltinModule === 'function') {
      return proc.getBuiltinModule('crypto') || proc.getBuiltinModule('node:crypto');
    }
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const req = typeof module !== 'undefined' && module.require ? module.require : (new Function('return typeof require !== "undefined" ? require : null')());
    return req ? req('crypto') : null;
  } catch {
    return null;
  }
};
const cryptoModule = getNodeCrypto();

export interface EntitlementTokenPayload {
  studentId: string;
  courseIds: string[];
  expiresAt: string;
  serverTime: number;
}

export interface SignedEntitlementToken {
  payload: EntitlementTokenPayload;
  signature: string;
}

// Embedded public key for offline entitlement token verification
export const EMBEDDED_ENTITLEMENT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA/Xj5ZIOzrucHMsM+q6jZfWTL8isgEr7GEN5S6mHltYM=
-----END PUBLIC KEY-----`;

export function canonicalPayloadString(payload: EntitlementTokenPayload): string {
  // Sort course IDs to guarantee deterministic signature payload
  const normalized = {
    studentId: payload.studentId,
    courseIds: [...payload.courseIds].sort(),
    expiresAt: payload.expiresAt,
    serverTime: payload.serverTime,
  };
  return JSON.stringify(normalized);
}

/**
 * Signs an entitlement token on the server using Ed25519 private key.
 */
export function signEntitlementToken(
  payload: EntitlementTokenPayload,
  privateKeyPem = process.env.ENTITLEMENT_PRIVATE_KEY,
): SignedEntitlementToken {
  if (!privateKeyPem) {
    throw new Error('ENTITLEMENT_PRIVATE_KEY environment variable or parameter is required to sign tokens');
  }
  const data = Buffer.from(canonicalPayloadString(payload), 'utf8');
  if (!cryptoModule) {
    throw new Error('Cryptographic signing is only available in server-side Node.js environment');
  }
  const signature = cryptoModule.sign(null, data, privateKeyPem).toString('hex');
  return {
    payload,
    signature,
  };
}

export type TokenVerificationResult =
  | {
      valid: true;
      payload: EntitlementTokenPayload;
      newLastSeenServerTimeMs: number;
    }
  | {
      valid: false;
      reason: 'INVALID_SIGNATURE' | 'CLOCK_ROLLBACK_DETECTED' | 'TOKEN_EXPIRED';
    };

/**
 * Verifies a signed entitlement token offline with an embedded public key
 * and guards against device clock rollback attacks using last seen server time.
 */
export function verifyEntitlementTokenOffline(
  token: SignedEntitlementToken,
  options: {
    currentDeviceTimeMs?: number;
    lastSeenServerTimeMs?: number;
    publicKeyPem?: string;
  } = {},
): TokenVerificationResult {
  const {
    currentDeviceTimeMs = Date.now(),
    lastSeenServerTimeMs = 0,
    publicKeyPem = EMBEDDED_ENTITLEMENT_PUBLIC_KEY,
  } = options;

  // 1. Verify cryptographic signature
  try {
    if (cryptoModule) {
      const data = Buffer.from(canonicalPayloadString(token.payload), 'utf8');
      const signatureBuffer = Buffer.from(token.signature, 'hex');
      const isValidSignature = cryptoModule.verify(null, data, publicKeyPem, signatureBuffer);
      if (!isValidSignature) {
        return { valid: false, reason: 'INVALID_SIGNATURE' };
      }
    }
  } catch {
    return { valid: false, reason: 'INVALID_SIGNATURE' };
  }

  // 2. Clock rollback protection:
  // If device wall clock is behind the last seen server time or earlier than token issue time,
  // the student has wound back their clock to bypass expiration.
  if (currentDeviceTimeMs < lastSeenServerTimeMs || currentDeviceTimeMs < token.payload.serverTime) {
    return { valid: false, reason: 'CLOCK_ROLLBACK_DETECTED' };
  }

  // 3. Expiration check
  const expiryMs = new Date(token.payload.expiresAt).getTime();
  if (currentDeviceTimeMs >= expiryMs) {
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }

  const newLastSeenServerTimeMs = Math.max(lastSeenServerTimeMs, token.payload.serverTime);

  return {
    valid: true,
    payload: token.payload,
    newLastSeenServerTimeMs,
  };
}
