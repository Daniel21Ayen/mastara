// apps/mobile/src/core/sync/ids.ts
import { uuidv7 } from '@mastara/domain';
import * as Crypto from 'expo-crypto';

/** A new time-ordered UUIDv7, for things the server must recognise if they arrive twice (exam sittings). */
export function newId(): string {
  return uuidv7(Date.now(), Crypto.getRandomBytes(10));
}
