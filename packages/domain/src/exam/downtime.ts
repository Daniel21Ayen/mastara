// packages/domain/src/exam/downtime.ts
/** A reading of both clocks at one moment. `uptimeMs` is time since the phone started and ignores date settings. */
export interface ClockReading {
  wallMs: number;
  uptimeMs: number;
}

/**
 * Time that passed while the app was closed during an exam, so a restart cannot give free minutes.
 * Takes the larger of wall-clock difference (ignored if negative) and uptime difference (only within the same boot).
 * Setting the date back therefore gains nothing; setting it forward only costs the student time.
 */
export function downtimeMs(saved: ClockReading, now: ClockReading): number {
  const wall = Math.max(0, now.wallMs - saved.wallMs);
  const sameBoot = now.uptimeMs >= saved.uptimeMs;
  const uptime = sameBoot ? now.uptimeMs - saved.uptimeMs : 0;
  return Math.max(wall, uptime);
}
