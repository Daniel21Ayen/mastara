let Device: typeof import('expo-device') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Device = require('expo-device');
} catch {
  Device = null;
}

import { nativeBootId, nativeElapsedRealtimeMs } from '../../../modules/mastara-clock';

/**
 * Milliseconds since the phone started. Does not change when the date or time setting changes.
 * Native build: counts time asleep. Expo Go: the system uptime from expo-device (may not count deep sleep).
 */
export async function getUptimeMs(): Promise<number> {
  const native = nativeElapsedRealtimeMs();
  if (native !== null && native !== undefined) return native;

  if (Device?.getUptimeAsync) return Device.getUptimeAsync();
  return typeof process !== 'undefined' && process.uptime ? Math.floor(process.uptime() * 1000) : Date.now();
}


/** Changes at every restart, so the downtime rule can tell a restart exactly. Undefined when the phone cannot tell. */
export function getBootId(): string | undefined {
  return nativeBootId();
}
