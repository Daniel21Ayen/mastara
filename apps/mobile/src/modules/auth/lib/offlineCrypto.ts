// apps/mobile/src/modules/auth/lib/offlineCrypto.ts

export interface PasswordHashRecord {
  algorithm: 'PBKDF2-SHA256';
  salt: string;       // Hex encoded 16-byte salt
  hash: string;       // Hex encoded derived key (32 bytes)
  iterations: number; // Configured for budget phones
}

const DEFAULT_ITERATIONS = 5000; // Tuned for budget Android phones (~10-30ms)

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function getRandomBytes(length: number): Uint8Array {
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

// Pure JS SHA256 and HMAC-SHA256 for React Native Hermes where crypto.subtle is absent
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rawSha256(bytes: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = bytes.length;
  const bitLen = len * 8;
  const padLen = (len % 64 < 56) ? (56 - (len % 64)) : (120 - (len % 64));
  const totalLen = len + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes, 0);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 4, bitLen >>> 0, false);
  view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const wt15 = w[t - 15]!;
      const wt2 = w[t - 2]!;
      const wt16 = w[t - 16]!;
      const wt7 = w[t - 7]!;
      const s0 = ((wt15 >>> 7) | (wt15 << 25)) ^ ((wt15 >>> 18) | (wt15 << 14)) ^ (wt15 >>> 3);
      const s1 = ((wt2 >>> 17) | (wt2 << 15)) ^ ((wt2 >>> 19) | (wt2 << 13)) ^ (wt2 >>> 10);
      w[t] = (wt16 + s0 + wt7 + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + SHA256_K[t]! + w[t]!) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  let k = key;
  if (k.length > 64) {
    k = rawSha256(k);
  }
  const keyPad = new Uint8Array(64);
  keyPad.set(k, 0);

  const ipad = new Uint8Array(64 + data.length);
  const opad = new Uint8Array(64 + 32);

  for (let i = 0; i < 64; i++) {
    const kp = keyPad[i] ?? 0;
    ipad[i] = kp ^ 0x36;
    opad[i] = kp ^ 0x5c;
  }
  ipad.set(data, 64);
  const innerHash = rawSha256(ipad);
  opad.set(innerHash, 64);
  return rawSha256(opad);
}

function pbkdf2Sync(password: string | Uint8Array, salt: Uint8Array, iterations: number, dkLen = 32): Uint8Array {
  const enc = new TextEncoder();
  const pwBytes = typeof password === 'string' ? enc.encode(password) : password;
  const numBlocks = Math.ceil(dkLen / 32);
  const dk = new Uint8Array(numBlocks * 32);

  for (let block = 1; block <= numBlocks; block++) {
    const saltBlock = new Uint8Array(salt.length + 4);
    saltBlock.set(salt, 0);
    saltBlock[salt.length] = (block >>> 24) & 0xff;
    saltBlock[salt.length + 1] = (block >>> 16) & 0xff;
    saltBlock[salt.length + 2] = (block >>> 8) & 0xff;
    saltBlock[salt.length + 3] = block & 0xff;

    let u = hmacSha256(pwBytes, saltBlock);
    const t = new Uint8Array(u);

    for (let c = 1; c < iterations; c++) {
      u = hmacSha256(pwBytes, u);
      for (let j = 0; j < 32; j++) {
        t[j] = (t[j] ?? 0) ^ (u[j] ?? 0);
      }
    }
    dk.set(t, (block - 1) * 32);
  }
  return dk.slice(0, dkLen);
}

/**
 * Derive a salted PBKDF2-SHA256 hash from password and salt.
 */
async function derivePbkdf2Hash(
  password: string,
  saltBytes: Uint8Array,
  iterations: number,
): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.importKey === 'function') {
    try {
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
          salt: saltBytes as unknown as BufferSource,
          iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        256,
      );

      return bufferToHex(derivedBits);
    } catch {
      // Fall through to pure JS fallback
    }
  }

  const derived = pbkdf2Sync(password, saltBytes, iterations, 32);
  return bufferToHex(derived);
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
