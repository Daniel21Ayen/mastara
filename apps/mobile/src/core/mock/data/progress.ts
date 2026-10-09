// apps/mobile/src/core/mock/data/progress.ts
import type { AccessState } from '@mastara/domain';

/** Stable pseudo-random number from an ID, so mock data looks the same on every launch. */
function hash(id: string): number {
  let value = 0;
  for (const char of id) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

export const MOCK_CHAPTERS_PER_COURSE = 10;

export function mockProgressFor(courseId: string): { chaptersDone: number; chaptersTotal: number } {
  return { chaptersDone: hash(courseId) % (MOCK_CHAPTERS_PER_COURSE + 1), chaptersTotal: MOCK_CHAPTERS_PER_COURSE };
}

const ACCESS_CYCLE: readonly AccessState[] = ['PAID', 'FREE_TRIAL', 'PAID', 'LOCKED', 'FREE_TRIAL'];

export function mockAccessFor(courseId: string): { access: AccessState; daysLeft?: number } {
  const seed = hash(courseId);
  const access = ACCESS_CYCLE[seed % ACCESS_CYCLE.length] ?? 'FREE_TRIAL';
  return access === 'PAID' ? { access, daysLeft: 10 + (seed % 30) } : { access };
}
