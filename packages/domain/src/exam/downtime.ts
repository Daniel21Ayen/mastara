// packages/domain/src/exam/downtime.ts
/** A reading of the clocks at one moment. `uptimeMs` counts time since the phone started, including time asleep. */
export interface ClockReading {
  wallMs: number;
  uptimeMs: number;
  /** Changes every time the phone restarts (Android boot count). Missing when the phone cannot tell. */
  bootId?: string;
}

/**
 * Time that passed while the app was closed during an exam, so a restart cannot give free minutes.
 * Takes the larger of the wall-clock difference (ignored if negative) and the uptime difference.
 * The uptime difference only counts inside one boot: a phone that restarted starts counting from zero, so only the
 * wall clock is left. When both readings carry a boot ID the check is exact; otherwise a smaller uptime means a restart.
 * Setting the date back therefore gains nothing while the phone stays on; setting it forward only costs the student time.
 */
export function downtimeMs(saved: ClockReading, now: ClockReading): number {
  const wall = Math.max(0, now.wallMs - saved.wallMs);

  const bothKnown = saved.bootId !== undefined && now.bootId !== undefined;
  const sameBoot = bothKnown ? saved.bootId === now.bootId : now.uptimeMs >= saved.uptimeMs;
  const uptime = sameBoot ? Math.max(0, now.uptimeMs - saved.uptimeMs) : 0;

  return Math.max(wall, uptime);
}
