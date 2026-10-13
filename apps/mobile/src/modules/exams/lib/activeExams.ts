// apps/mobile/src/modules/exams/lib/activeExams.ts
/** Exams whose screen is open right now. The background finisher leaves these alone; the screen finishes them itself. */
const active = new Set<string>();

export const activeExams = {
  add: (key: string): void => void active.add(key),
  remove: (key: string): void => void active.delete(key),
  has: (key: string): boolean => active.has(key),
};
