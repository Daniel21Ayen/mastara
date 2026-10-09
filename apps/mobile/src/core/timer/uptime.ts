// apps/mobile/src/core/timer/uptime.ts
import * as Device from 'expo-device';

/** Milliseconds since the phone started. Does not change when the date or time setting changes. */
export async function getUptimeMs(): Promise<number> {
  return Device.getUptimeAsync();
}
