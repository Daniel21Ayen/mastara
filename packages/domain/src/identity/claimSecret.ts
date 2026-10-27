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
  if (cryptoModule?.createHash) {
    return cryptoModule.createHash('sha256').update(secret.trim()).digest('hex');
  }
  // Fallback to SubtleCrypto if in browser/standard environment
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    // Synchronous sha256 fallback implementation for browser/JS runtimes without synchronous subtleCrypto
    return fastSha256Hex(secret.trim());
  }
  return fastSha256Hex(secret.trim());
}

/**
 * Validates whether a presented claim secret matches the stored hash.
 * Uses constant-time comparison when crypto is available to prevent timing attacks.
 */
export function verifyClaimSecret(secret: string, expectedHash: string): boolean {
  if (!secret || !expectedHash) return false;
  try {
    const computedHash = hashClaimSecret(secret);
    if (cryptoModule?.timingSafeEqual) {
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
  // Fallback pseudo-random for test environments if crypto is missing
  let result = '';
  for (let i = 0; i < 64; i += 1) {
    result += Math.floor(Math.random() * 16).toString(16);
  }
  return result;
}

/**
 * Pure TypeScript SHA-256 implementation used as universal fallback.
 */
function fastSha256Hex(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0;
  let j = 0;

  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeClearHex = '';
  for (i = 0; i < ascii[lengthProperty]; i += 1) {
    const code = ascii.charCodeAt(i);
    words[i >> 2] |= (code & 0xff) << (24 - (i % 4) * 8);
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j += 1) {
      const w15 = w[j - 15];
      const w2 = w[j - 2];

      const s0 = j >= 16 ? ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3) : 0;
      const s1 = j >= 16 ? ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10) : 0;
      if (j >= 16) {
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const h0 = hash[0];
      const h1 = hash[1];
      const h2 = hash[2];
      const h4 = hash[4];
      const s1_maj = ((h4 >>> 6) | (h4 << 26)) ^ ((h4 >>> 11) | (h4 << 21)) ^ ((h4 >>> 25) | (h4 << 7));
      const ch = (h4 & hash[5]) ^ (~h4 & hash[6]);
      const temp1 = (hash[7] + s1_maj + ch + k[j] + w[j]) | 0;
      const s0_maj = ((h0 >>> 2) | (h0 << 30)) ^ ((h0 >>> 13) | (h0 << 19)) ^ ((h0 >>> 22) | (h0 << 10));
      const maj = (h0 & h1) ^ (h0 & h2) ^ (h1 & h2);
      const temp2 = (s0_maj + maj) | 0;

      hash = [(temp1 + temp2) | 0, h0, h1, h2, (hash[3] + temp1) | 0, h4, hash[5], hash[6]];
    }

    for (j = 0; j < 8; j += 1) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i += 1) {
    for (j = 3; j >= 0; j -= 1) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}
