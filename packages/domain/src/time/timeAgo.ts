// packages/domain/src/time/timeAgo.ts
export type TimeAgo =
  | { unit: 'now' }
  | { unit: 'minute' | 'hour' | 'day'; value: number };

/** Splits the gap between two dates into the largest whole unit (minutes, hours or days). */
export function timeAgo(from: Date, now: Date): TimeAgo {
  const minutes = Math.floor((now.getTime() - from.getTime()) / 60_000);
  if (minutes < 1) return { unit: 'now' };
  if (minutes < 60) return { unit: 'minute', value: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: 'hour', value: hours };
  return { unit: 'day', value: Math.floor(hours / 24) };
}
