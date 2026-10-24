// apps/mobile/src/modules/auth/lib/offlineCrypto.ts

export interface PasswordHashRecord {
  algorithm: 'PBKDF2-SHA256';
  salt: string;       // Hex encoded 16-byte salt
  hash: string;       // Hex encoded derived key (32 bytes)
  iterations: number; // Configured for budget phones
}

const DEFAULT_ITERATIONS = 5000; // Tuned for budget Android phones (~10-30ms)

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function getRandomBytes(length: number): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint8Array(length));
  }
  // Fallback
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Derive a salted PBKDF2-SHA256 hash from password and salt.
 */
async function derivePbkdf2Hash(
  password: string,
  saltBytes: Uint8Array,
  iterations: number,
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return bufferToHex(derivedBits);
}

/**
 * Hash a plaintext password with unique random salt using PBKDF2-SHA256.
 */
export async function hashPassword(
  password: string,
  iterations: number = DEFAULT_ITERATIONS,
): Promise<PasswordHashRecord> {
  const saltBytes = getRandomBytes(16);
  const saltHex = bufferToHex(saltBytes);
  const hashHex = await derivePbkdf2Hash(password, saltBytes, iterations);

  return {
    algorithm: 'PBKDF2-SHA256',
    salt: saltHex,
    hash: hashHex,
    iterations,
  };
}

/**
 * Verify a plaintext password against a stored PasswordHashRecord using constant-time comparison.
 */
export async function verifyPassword(
  password: string,
  record: PasswordHashRecord,
): Promise<boolean> {
  if (!record || !record.salt || !record.hash) {
    return false;
  }

  try {
    const saltBytes = hexToBytes(record.salt);
    const computedHash = await derivePbkdf2Hash(
      password,
      saltBytes,
      record.iterations || DEFAULT_ITERATIONS,
    );
    return timingSafeEqual(computedHash, record.hash);
  } catch (err) {
    return false;
  }
}
