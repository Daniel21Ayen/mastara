// packages/domain/src/uuid/uuidv7.ts
/**
 * Time-ordered unique ID (UUID version 7): 48-bit millisecond timestamp, then random bits.
 * IDs sort by creation time and are unique per change, so the server can ignore a repeated upload.
 * `random` must hold at least 10 random bytes.
 */
export function uuidv7(nowMs: number, random: ArrayLike<number>): string {
  const bytes = new Uint8Array(16);

  let timestamp = Math.floor(nowMs);
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }
  for (let i = 0; i < 10; i += 1) bytes[6 + i] = (random[i] ?? 0) & 0xff;

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70; // version 7
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 10

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
