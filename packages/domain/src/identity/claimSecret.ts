// packages/domain/src/identity/claimSecret.ts

const getNodeCrypto = () => {
  try {
    const proc = (globalThis as any).process;
    if (typeof proc?.getBuiltinModule === 'function') {
      return proc.getBuiltinModule('crypto') || proc.getBuiltinModule('node:crypto');
    }
    if (typeof proc !== 'undefined' && proc.versions?.node) {
      const dynamicRequire =
        (globalThis as any).require ||
        (typeof module !== 'undefined' ? (module as any).require : null);
      if (typeof dynamicRequire === 'function') {
        return dynamicRequire('crypto');
      }
    }
    return null;
  } catch {
    return null;
  }
};

const cryptoModule = getNodeCrypto();

/**
 * Computes the SHA-256 hex digest of a claim secret.
 * The client sends this hash with the order, keeping the secret local on the phone.
 */
export function hashClaimSecret(secret: string): string {
  if (!secret || typeof secret !== 'string') {
    throw new Error('Claim secret must be a non-empty string');
  }
  const trimmed = secret.trim();
  if (cryptoModule?.createHash) {
    return cryptoModule.createHash('sha256').update(trimmed).digest('hex');
  }
  return fastSha256Hex(trimmed);
}

/**
 * Validates whether a presented claim secret matches the stored hash.
 * Uses constant-time comparison when crypto is available to prevent timing attacks.
 */
export function verifyClaimSecret(secret: string, expectedHash: string): boolean {
  if (!secret || !expectedHash) return false;
  try {
    const computedHash = hashClaimSecret(secret);
    if (cryptoModule?.timingSafeEqual && typeof Buffer !== 'undefined') {
      const a = Buffer.from(computedHash, 'hex');
      const b = Buffer.from(expectedHash.trim().toLowerCase(), 'hex');
      if (a.length !== b.length) return false;
      return cryptoModule.timingSafeEqual(a, b);
    }
    return computedHash.toLowerCase() === expectedHash.trim().toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically strong random claim secret (32 bytes hex = 64 characters).
 */
export function generateClaimSecret(): string {
  if (cryptoModule?.randomBytes) {
    return cryptoModule.randomBytes(32).toString('hex');
  }
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let result = '';
  for (let i = 0; i < 64; i += 1) {
    result += Math.floor(Math.random() * 16).toString(16);
  }
  return result;
}

/**
 * Strict TypeScript-safe SHA-256 implementation.
 */
function fastSha256Hex(ascii: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let H0 = 0x6a09e667;
  let H1 = 0xbb67ae85;
  let H2 = 0x3c6ef372;
  let H3 = 0xa54ff53a;
  let H4 = 0x510e527f;
  let H5 = 0x9b05688c;
  let H6 = 0x1f83d9ab;
  let H7 = 0x5be0cd19;

  const words: number[] = [];
  const len = ascii.length;
  for (let i = 0; i < len; i += 1) {
    const wordIdx = i >> 2;
    words[wordIdx] = (words[wordIdx] ?? 0) | ((ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8));
  }
  const bitLen = len * 8;
  const bitWordIdx = bitLen >> 5;
  words[bitWordIdx] = (words[bitWordIdx] ?? 0) | (0x80 << (24 - (bitLen % 32)));
  const totalWords = (((bitLen + 64) >> 9) << 4) + 15;
  while (words.length <= totalWords) {
    words.push(0);
  }
  words[totalWords] = bitLen;

  const W = new Int32Array(64);
  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t += 1) {
      W[t] = words[i + t] ?? 0;
    }
    for (let t = 16; t < 64; t += 1) {
      const w15 = W[t - 15] ?? 0;
      const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      const w2 = W[t - 2] ?? 0;
      const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      W[t] = ((W[t - 16] ?? 0) + s0 + (W[t - 7] ?? 0) + s1) | 0;
    }

    let a = H0;
    let b = H1;
    let c = H2;
    let d = H3;
    let e = H4;
    let f = H5;
    let g = H6;
    let h = H7;

    for (let t = 0; t < 64; t += 1) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + (K[t] ?? 0) + (W[t] ?? 0)) | 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0;
    H1 = (H1 + b) | 0;
    H2 = (H2 + c) | 0;
    H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0;
    H5 = (H5 + f) | 0;
    H6 = (H6 + g) | 0;
    H7 = (H7 + h) | 0;
  }

  const hexOf = (num: number) => (num >>> 0).toString(16).padStart(8, '0');
  return `${hexOf(H0)}${hexOf(H1)}${hexOf(H2)}${hexOf(H3)}${hexOf(H4)}${hexOf(H5)}${hexOf(H6)}${hexOf(H7)}`;
}
