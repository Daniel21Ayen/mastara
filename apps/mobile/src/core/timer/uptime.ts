// apps/mobile/src/core/timer/uptime.ts
import * as Device from 'expo-device';

import { nativeBootId, nativeElapsedRealtimeMs } from '../../../modules/mastara-clock';

/**
 * Milliseconds since the phone started. Does not change when the date or time setting changes.
 * Native build: counts time asleep. Expo Go: the system uptime from expo-device (may not count deep sleep).
 */
export async function getUptimeMs(): Promise<number> {
  return nativeElapsedRealtimeMs() ?? Device.getUptimeAsync();
}

/** Changes at every restart, so the downtime rule can tell a restart exactly. Undefined when the phone cannot tell. */
export function getBootId(): string | undefined {
  return nativeBootId();
}
