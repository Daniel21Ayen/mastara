// apps/mobile/modules/mastara-clock/index.ts
import { requireOptionalNativeModule } from 'expo-modules-core';

interface MastaraClockNative {
  elapsedRealtimeMs(): number;
  bootId(): string;
}

/** Null in Expo Go and in builds made before this module existed. Callers then use the JavaScript clocks. */
const native = requireOptionalNativeModule<MastaraClockNative>('MastaraClock');

export const nativeClockAvailable = native !== null;

/** Milliseconds since the phone started, including time asleep; null when the native module is missing. */
export function nativeElapsedRealtimeMs(): number | null {
  return native ? native.elapsedRealtimeMs() : null;
}

/** Changes at every restart; undefined when unknown. */
export function nativeBootId(): string | undefined {
  const id = native?.bootId();
  return id ? id : undefined;
}
