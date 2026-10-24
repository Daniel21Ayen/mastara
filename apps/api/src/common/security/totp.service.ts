import * as crypto from "crypto";
import { Injectable } from "@nestjs/common";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(encoded: string): Buffer {
  const clean = encoded.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]!;
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i] ?? 0;
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? "";
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? "";
  }

  return output;
}

@Injectable()
export class TotpService {
  private readonly stepSeconds = 30;
  private readonly digits = 6;

  generateSecret(): string {
    const randomBytes = crypto.randomBytes(20);
    return base32Encode(randomBytes);
  }

  generateKeyUri(account: string, secret: string, issuer: string = "Mastara"): string {
    const encAccount = encodeURIComponent(account);
    const encIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encIssuer}:${encAccount}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=${this.digits}&period=${this.stepSeconds}`;
  }

  generateTotp(secret: string, timestamp: number = Date.now()): string {
    const key = base32Decode(secret);
    const counter = Math.floor(timestamp / 1000 / this.stepSeconds);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac("sha1", key);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    const lastByte = digest[digest.length - 1] ?? 0;
    const offset = lastByte & 0x0f;
    const b0 = digest[offset] ?? 0;
    const b1 = digest[offset + 1] ?? 0;
    const b2 = digest[offset + 2] ?? 0;
    const b3 = digest[offset + 3] ?? 0;

    const code =
      ((b0 & 0x7f) << 24) |
      ((b1 & 0xff) << 16) |
      ((b2 & 0xff) << 8) |
      (b3 & 0xff);

    const otp = (code % Math.pow(10, this.digits)).toString().padStart(this.digits, "0");
    return otp;
  }

  /**
   * Verify TOTP code with +-1 step drift allowance for clock skew
   */
  verifyTotp(token: string, secret: string, timestamp: number = Date.now()): boolean {
    if (!token || !secret || token.length !== this.digits) {
      return false;
    }

    const cleanToken = token.trim();
    for (const drift of [-1, 0, 1]) {
      const checkTime = timestamp + drift * this.stepSeconds * 1000;
      const expected = this.generateTotp(secret, checkTime);
      if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
        return true;
      }
    }

    return false;
  }
}
