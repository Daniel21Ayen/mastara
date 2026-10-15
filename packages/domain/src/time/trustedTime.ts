// packages/domain/src/time/trustedTime.ts
import type { ClockReading } from '../exam/downtime';

/**
 * "Now" for judging saved data (such as how long paid access still lasts) when the phone may be offline for days.
 * Inside the same boot the phone's uptime clock says how much time really passed since the data was saved, even if the
 * date was set back. The later of that and the calendar date is used, so moving the date backwards never gains time.
 * After a restart (or without an uptime clock) only the calendar date is left.
 */
export function trustedNowMs(cachedAtMs: number, saved: ClockReading | undefined, now: ClockReading): number {
  if (!saved) return now.wallMs;

  const bothKnown = saved.bootId !== undefined && now.bootId !== undefined;
  const sameBoot = bothKnown ? saved.bootId === now.bootId : now.uptimeMs >= saved.uptimeMs;
  if (!sameBoot) return now.wallMs;

  return Math.max(now.wallMs, cachedAtMs + (now.uptimeMs - saved.uptimeMs));
}
