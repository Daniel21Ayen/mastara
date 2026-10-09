// packages/domain/src/progress/progress.ts
import type { CourseTab } from '../constants/learning';

export type ProgressState = 'NOT_STARTED' | 'ONGOING' | 'COMPLETED';

/** Whole-number percent of chapters done, clamped to 0..100. */
export function progressPercent(chaptersDone: number, chaptersTotal: number): number {
  if (chaptersTotal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((chaptersDone / chaptersTotal) * 100)));
}

export function progressState(percent: number): ProgressState {
  if (percent <= 0) return 'NOT_STARTED';
  return percent >= 100 ? 'COMPLETED' : 'ONGOING';
}

/** All = every course; Ongoing = above 0% and below 100%; Completed = 100%. */
export function matchesTab(state: ProgressState, tab: CourseTab): boolean {
  if (tab === 'ALL') return true;
  return tab === 'ONGOING' ? state === 'ONGOING' : state === 'COMPLETED';
}
