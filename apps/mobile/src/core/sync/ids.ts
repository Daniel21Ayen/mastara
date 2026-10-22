// apps/mobile/src/core/sync/ids.ts
import { uuidv7 } from '@mastara/domain';

function get10RandomBytes(): Uint8Array {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint8Array(10));
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Crypto = require('expo-crypto');
  return Crypto.getRandomBytes(10);
}

/** A new time-ordered UUIDv7, for things the server must recognise if they arrive twice (exam sittings). */
export function newId(): string {
  return uuidv7(Date.now(), get10RandomBytes());
}
