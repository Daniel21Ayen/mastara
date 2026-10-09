// apps/mobile/src/core/mock/data/semesters.ts
import type { Semester } from '@mastara/contracts';

import { programs } from './programs';

/** Every program has two freshman semesters. */
export const semesters: readonly Semester[] = programs.flatMap((program) => [
  { id: `${program.id}-s1`, programId: program.id, number: 1 as const },
  { id: `${program.id}-s2`, programId: program.id, number: 2 as const },
]);
