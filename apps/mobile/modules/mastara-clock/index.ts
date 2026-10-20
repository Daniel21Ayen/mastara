let requireOptionalNativeModule: (<T>(name: string) => T | null) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  requireOptionalNativeModule = require('expo-modules-core').requireOptionalNativeModule;
} catch {
  requireOptionalNativeModule = null;
}

interface MastaraClockNative {
  elapsedRealtimeMs(): number;
  bootId(): string;
}

/** Null in Expo Go and in builds made before this module existed. Callers then use the JavaScript clocks. */
const native = requireOptionalNativeModule ? requireOptionalNativeModule<MastaraClockNative>('MastaraClock') : null;


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
