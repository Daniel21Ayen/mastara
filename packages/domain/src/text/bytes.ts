// packages/domain/src/text/bytes.ts

/** Size of a string once stored as UTF-8 (Amharic letters take 3 bytes, English 1). Counted without TextEncoder, which older phones lack. */
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4; // a surrogate pair is one character of 4 bytes
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

/** "0 B", "812 KB", "1.4 MB": short sizes for the download list. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
